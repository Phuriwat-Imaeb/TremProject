package store

import "context"

// ตัวเลขสรุปของหน้าแดชบอร์ดหลังบ้าน (schema Stats ใน openapi.yaml)
// "วันนี้" นับตามเวลาไทยเสมอ ไม่ว่า server จะตั้งเขตเวลาไว้ที่ไหน

// DayCount จำนวนการจองที่เกิดในหนึ่งวัน แยกที่ยังจองอยู่กับที่ยกเลิกไปแล้ว
type DayCount struct {
	Date      string `json:"date"` // "YYYY-MM-DD" ตามเวลาไทย
	Confirmed int    `json:"confirmed"`
	Cancelled int    `json:"cancelled"`
}

// RecentBooking การจองล่าสุดพร้อมชื่อคนจอง ไว้ทำรายการ "กิจกรรมล่าสุด"
type RecentBooking struct {
	Booking
	Member Person `json:"member"`
}

type Stats struct {
	Today            string          `json:"today"`
	BookingsToday    int             `json:"bookingsToday"`    // การจองที่เกิดวันนี้และยังไม่ยกเลิก
	SeatsToday       int             `json:"seatsToday"`       // ที่นั่งในการจองเหล่านั้น
	RevenueTodayBaht int             `json:"revenueTodayBaht"` // ยอดเงินของการจองเหล่านั้น
	UpcomingTrips    int             `json:"upcomingTrips"`    // รอบที่เปิดขายและจะออกภายใน 7 วัน
	Daily            []DayCount      `json:"daily"`            // 7 วันล่าสุด เก่าไปใหม่ (วันสุดท้าย = วันนี้)
	RecentBookings   []RecentBooking `json:"recentBookings"`
	NextTrips        []Trip          `json:"nextTrips"`
}

const (
	statsRecent = 6
	statsNext   = 5
)

// เที่ยงคืนของวันนี้ตามเวลาไทย เป็นเวลาจริง (timestamptz) ไว้เทียบกับ created_at ตรง ๆ
const todayStart = `((now() AT TIME ZONE 'Asia/Bangkok')::date::timestamp AT TIME ZONE 'Asia/Bangkok')`

// Stats รวมทุกตัวเลขของแดชบอร์ดไว้ในคำขอเดียว หน้าเว็บยิงครั้งเดียวจบ
func (s *Store) Stats(ctx context.Context) (Stats, error) {
	var st Stats
	// การ์ดตัวเลข: query เดียว หลายคำสั่งย่อย ได้ทุกตัวในแถวเดียว
	err := s.Pool.QueryRow(ctx,
		`SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date::text,
		        (SELECT count(*) FROM bookings b
		          WHERE b.status = 'confirmed' AND b.created_at >= `+todayStart+`),
		        (SELECT count(*) FROM booking_seats bs JOIN bookings b ON b.id = bs.booking_id
		          WHERE NOT bs.released AND b.created_at >= `+todayStart+`),
		        (SELECT coalesce(sum(b.total_baht), 0) FROM bookings b
		          WHERE b.status = 'confirmed' AND b.created_at >= `+todayStart+`),
		        (SELECT count(*) FROM trips t
		          WHERE t.status = 'scheduled' AND t.depart_at > now() AND t.depart_at < now() + interval '7 days')`).
		Scan(&st.Today, &st.BookingsToday, &st.SeatsToday, &st.RevenueTodayBaht, &st.UpcomingTrips)
	if err != nil {
		return st, err
	}

	// กราฟ 7 วัน: generate_series สร้างครบทุกวัน วันที่ไม่มีใครจองจึงได้ 0 ไม่หายไปจากกราฟ
	rows, err := s.Pool.Query(ctx,
		`SELECT d::date::text,
		        count(b.id) FILTER (WHERE b.status = 'confirmed'),
		        count(b.id) FILTER (WHERE b.status = 'cancelled')
		   FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date - 6,
		                        (now() AT TIME ZONE 'Asia/Bangkok')::date, interval '1 day') AS d
		   LEFT JOIN bookings b ON (b.created_at AT TIME ZONE 'Asia/Bangkok')::date = d::date
		  GROUP BY d ORDER BY d`)
	if err != nil {
		return st, err
	}
	st.Daily = []DayCount{}
	for rows.Next() {
		var d DayCount
		if err := rows.Scan(&d.Date, &d.Confirmed, &d.Cancelled); err != nil {
			rows.Close()
			return st, err
		}
		st.Daily = append(st.Daily, d)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return st, err
	}

	// กิจกรรมล่าสุด: เรียงตาม updated_at การยกเลิกจึงขึ้นมาบนสุดด้วย ไม่ใช่แค่การจองใหม่
	rows, err = s.Pool.Query(ctx,
		`SELECT `+bookingCols+`, m.id, m.display_name`+bookingFrom+`
		   JOIN members m ON m.id = b.member_id
		  ORDER BY b.updated_at DESC, b.id DESC
		  LIMIT $1`, statsRecent)
	if err != nil {
		return st, err
	}
	st.RecentBookings = []RecentBooking{}
	for rows.Next() {
		var r RecentBooking
		dest := append([]any{&r.ID, &r.MemberID, &r.TotalBaht, &r.Status, &r.CancelledAt, &r.CreatedAt, &r.Seats},
			r.Trip.scanDest()...)
		dest = append(dest, &r.Member.ID, &r.Member.DisplayName)
		if err := rows.Scan(dest...); err != nil {
			rows.Close()
			return st, err
		}
		st.RecentBookings = append(st.RecentBookings, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return st, err
	}

	// รอบที่จะออกถัดไป
	rows, err = s.Pool.Query(ctx,
		`SELECT `+tripCols+tripFrom+`
		  WHERE t.status = 'scheduled' AND t.depart_at > now()
		  ORDER BY t.depart_at, t.id
		  LIMIT $1`, statsNext)
	if err != nil {
		return st, err
	}
	defer rows.Close()
	st.NextTrips = []Trip{}
	for rows.Next() {
		t, err := scanTrip(rows)
		if err != nil {
			return st, err
		}
		st.NextTrips = append(st.NextTrips, t)
	}
	return st, rows.Err()
}
