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

// BookingByID การจองหนึ่งรายการ พร้อมรอบรถและเลขที่นั่ง ไม่มี id นี้ → ErrNotFound
func (s *Store) BookingByID(ctx context.Context, id int64) (Booking, error) {
	var b Booking
	var tripID int64
	err := s.Pool.QueryRow(ctx,
		`SELECT b.id, b.member_id, b.trip_id, b.total_baht, b.status, b.cancelled_at, b.created_at,
		        ARRAY(SELECT bs.seat_no FROM booking_seats bs WHERE bs.booking_id = b.id ORDER BY bs.seat_no)
		   FROM bookings b WHERE b.id = $1`, id).
		Scan(&b.ID, &b.MemberID, &tripID, &b.TotalBaht, &b.Status, &b.CancelledAt, &b.CreatedAt, &b.Seats)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, err
	}
	b.Trip, err = s.TripByID(ctx, tripID)
	return b, err
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
	var status string
	var departed bool
	var price int
	var seatCount int16
	err = tx.QueryRow(ctx,
		`SELECT t.status, t.depart_at <= now(), t.price_baht, v.seat_count
		   FROM trips t JOIN vehicles v ON v.id = t.vehicle_id
		  WHERE t.id = $1
		    FOR SHARE OF t`, tripID).Scan(&status, &departed, &price, &seatCount)
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
