package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrTripClosed รอบรถถูกยกเลิกหรือออกไปแล้ว จอง/ยกเลิกไม่ได้ handler แปลเป็น 409 TRIP_CLOSED
var ErrTripClosed = errors.New("trip closed")

// SeatRangeError มีเลขที่นั่งเกินจำนวนที่นั่งของรถ handler แปลเป็น 400 BAD_SEATS
type SeatRangeError struct{ SeatCount int16 }

func (e SeatRangeError) Error() string { return fmt.Sprintf("seat out of range 1-%d", e.SeatCount) }

// SeatTakenError มีที่นั่งที่ขอถูกคนอื่นถืออยู่ handler แปลเป็น 409 SEAT_TAKEN
// Seats ว่างได้ ในกรณีที่แพ้กันตอนกดพร้อมกัน (รู้จาก unique index ไม่รู้ว่าเลขไหน)
type SeatTakenError struct{ Seats []int16 }

func (e SeatTakenError) Error() string { return fmt.Sprintf("seats taken %v", e.Seats) }

// Booking การจอง หน้าตาตรงกับ schema Booking ใน openapi.yaml
type Booking struct {
	ID          int64      `json:"id"`
	MemberID    int64      `json:"-"` // ไว้ให้ handler เช็กว่าเป็นของคนขอไหม ไม่ส่งออกไป
	Trip        Trip       `json:"trip"`
	Seats       []int16    `json:"seats"` // ยกเลิกแล้วก็ยังบอกว่าเคยจองที่ไหน (ประวัติ)
	TotalBaht   int        `json:"totalBaht"`
	Status      string     `json:"status"`
	CancelledAt *time.Time `json:"cancelledAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// ทุก query ของการจองดึงคอลัมน์ชุดเดียวกัน JOIN รอบรถมาในคราวเดียว
// หน้า "การจองของฉัน" จึงยิง query เดียวได้ทั้งหน้า ไม่ต้องวนถามรอบรถทีละการจอง (N+1)
const bookingCols = `b.id, b.member_id, b.total_baht, b.status, b.cancelled_at, b.created_at,
	ARRAY(SELECT bs.seat_no FROM booking_seats bs WHERE bs.booking_id = b.id ORDER BY bs.seat_no), ` + tripCols

const bookingFrom = ` FROM bookings b
	JOIN trips t ON t.id = b.trip_id
	JOIN routes r ON r.id = t.route_id
	JOIN vehicles v ON v.id = t.vehicle_id`

func scanBooking(row pgx.Row) (Booking, error) {
	var b Booking
	dest := append([]any{&b.ID, &b.MemberID, &b.TotalBaht, &b.Status, &b.CancelledAt, &b.CreatedAt, &b.Seats},
		b.Trip.scanDest()...)
	err := row.Scan(dest...)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	return b, err
}

// BookingByID การจองหนึ่งรายการ พร้อมรอบรถและเลขที่นั่ง ไม่มี id นี้ → ErrNotFound
func (s *Store) BookingByID(ctx context.Context, id int64) (Booking, error) {
	return scanBooking(s.Pool.QueryRow(ctx, `SELECT `+bookingCols+bookingFrom+` WHERE b.id = $1`, id))
}

// ListMemberBookings การจองของสมาชิกคนหนึ่ง ใหม่สุดก่อน ทีละหน้า คืนรายการ + จำนวนทั้งหมด
func (s *Store) ListMemberBookings(ctx context.Context, memberID int64, page, pageSize int) ([]Booking, int, error) {
	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM bookings WHERE member_id = $1`, memberID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.Pool.Query(ctx,
		`SELECT `+bookingCols+bookingFrom+`
		  WHERE b.member_id = $1
		  ORDER BY b.created_at DESC, b.id DESC
		  LIMIT $2 OFFSET $3`, memberID, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, b)
	}
	return out, total, rows.Err()
}

// CreateBooking จองที่นั่ง (handler ตรวจมาแล้วว่า seats ไม่ว่าง ไม่ซ้ำ เรียงแล้ว ไม่เกิน 10 ที่)
// ทำทั้งหมดใน transaction เดียว: ที่นั่งไหนไม่ว่างสักที่ ก็ไม่จองให้สักที่ (ไม่มีจองค้างครึ่ง ๆ)
func (s *Store) CreateBooking(ctx context.Context, memberID, tripID int64, seats []int16) (Booking, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback(ctx) // commit สำเร็จแล้ว rollback จะไม่ทำอะไร ถ้าออกกลางทางจะยกเลิกทุกอย่างให้

	// 1) อ่านรอบรถพร้อมล็อกแถวแบบ FOR SHARE: คนจองหลายคนถือล็อกนี้พร้อมกันได้
	//    แต่ staff ที่จะยกเลิกรอบ (UPDATE แถวนี้) ต้องรอจนการจองนี้จบก่อน จึงไม่มีการจองหลุดเข้ารอบที่เพิ่งถูกยกเลิก
	//    ล็อกแถวรถ (v) ด้วย: admin ที่จะลดจำนวนที่นั่ง (UpdateVehicle) ต้องรอ ไม่งั้นเลขที่นั่งที่เราเพิ่งตรวจว่าไม่เกินจะเกินได้
	var status string
	var departed bool
	var price int
	var seatCount int16
	err = tx.QueryRow(ctx,
		`SELECT t.status, t.depart_at <= now(), t.price_baht, v.seat_count
		   FROM trips t JOIN vehicles v ON v.id = t.vehicle_id
		  WHERE t.id = $1
		    FOR SHARE OF t, v`, tripID).Scan(&status, &departed, &price, &seatCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, err
	}
	if status != "scheduled" || departed {
		return Booking{}, ErrTripClosed
	}
	if seats[len(seats)-1] > seatCount { // เรียงมาแล้ว ตัวสุดท้ายคือเลขมากสุด
		return Booking{}, SeatRangeError{SeatCount: seatCount}
	}

	// 2) ถามก่อนว่ามีที่นั่งไหนไม่ว่าง เพื่อบอกผู้ใช้ได้ว่าเลขไหน
	//    ข้อนี้กันกรณีปกติ ส่วนกรณีกดพร้อมกันเป๊ะ ๆ ด่านจริงคือ unique index ในข้อ 4
	rows, err := tx.Query(ctx,
		`SELECT seat_no FROM booking_seats
		  WHERE trip_id = $1 AND NOT released AND seat_no = ANY($2)
		  ORDER BY seat_no`, tripID, seats)
	if err != nil {
		return Booking{}, err
	}
	taken, err := pgx.CollectRows(rows, pgx.RowTo[int16])
	if err != nil {
		return Booking{}, err
	}
	if len(taken) > 0 {
		return Booking{}, SeatTakenError{Seats: taken}
	}

	// 3) สร้างการจอง ยอดเงินคิดจากราคาตอนนี้ แล้วเก็บไว้ ราคารอบเปลี่ยนทีหลังยอดนี้ก็ไม่เปลี่ยน
	var bookingID int64
	err = tx.QueryRow(ctx,
		`INSERT INTO bookings (trip_id, member_id, total_baht) VALUES ($1, $2, $3) RETURNING id`,
		tripID, memberID, price*len(seats)).Scan(&bookingID)
	if err != nil {
		return Booking{}, err
	}

	// 4) ใส่ที่นั่งทีเดียวทุกที่ด้วย unnest (แตก array เป็นหลายแถว) ไม่ต้องวน INSERT ทีละที่
	//    ถ้ามีคนจองที่เดียวกันตัดหน้าไปหลังข้อ 2 จะชน booking_seats_one_holder_uq ได้ 23505
	_, err = tx.Exec(ctx,
		`INSERT INTO booking_seats (booking_id, trip_id, seat_no)
		 SELECT $1, $2, unnest($3::smallint[])`, bookingID, tripID, seats)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return Booking{}, SeatTakenError{}
	}
	if err != nil {
		return Booking{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return s.BookingByID(ctx, bookingID)
}

// ErrWrongStatus สถานะตอนนี้ทำรายการนี้ไม่ได้ เช่น ยกเลิกซ้ำ handler แปลเป็น 409 WRONG_STATUS
var ErrWrongStatus = errors.New("wrong status")

// CancelBooking ยกเลิกการจองของ memberID ที่นั่งกลับมาว่างทันที
// ของคนอื่นหรือไม่มี → ErrNotFound, ยกเลิกไปแล้ว → ErrWrongStatus, รถออก/รอบถูกยกเลิก → ErrTripClosed
func (s *Store) CancelBooking(ctx context.Context, id, memberID int64) (Booking, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback(ctx)

	// ล็อกแถวการจอง (FOR UPDATE) กันกดยกเลิกสองแท็บพร้อมกันแล้วทำงานซ้ำ แท็บที่สองจะรอแล้วเห็นว่า cancelled แล้ว
	var owner int64
	var status, tripStatus string
	var departed bool
	err = tx.QueryRow(ctx,
		`SELECT b.member_id, b.status, t.status, t.depart_at <= now()
		   FROM bookings b JOIN trips t ON t.id = b.trip_id
		  WHERE b.id = $1
		    FOR UPDATE OF b`, id).Scan(&owner, &status, &tripStatus, &departed)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && owner != memberID) {
		return Booking{}, ErrNotFound // ของคนอื่นตอบเหมือนหาไม่เจอ
	}
	if err != nil {
		return Booking{}, err
	}
	if status == "cancelled" {
		return Booking{}, ErrWrongStatus
	}
	if tripStatus != "scheduled" || departed {
		return Booking{}, ErrTripClosed
	}

	// สองคำสั่งนี้ต้องสำเร็จคู่กัน: ถ้าการจองเป็น cancelled แต่ที่นั่งยังไม่ปล่อย ที่นั่งจะว่างไม่ได้อีกเลย
	if _, err := tx.Exec(ctx,
		`UPDATE bookings SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1`, id); err != nil {
		return Booking{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE booking_seats SET released = true WHERE booking_id = $1`, id); err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return s.BookingByID(ctx, id)
}
