package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// งานหลังบ้านของพนักงาน (staff/admin): จัดการรอบรถ ดูรายชื่อผู้โดยสาร

// ErrBadRef routeId หรือ vehicleId ไม่มีอยู่จริง (ชน foreign key 23503) handler แปลเป็น 400 BAD_REF
var ErrBadRef = errors.New("bad reference")

// ErrVehicleBusy รถคันนี้มีรอบออกเวลานี้แล้ว (ชน UNIQUE (vehicle_id, depart_at) 23505) handler แปลเป็น 409
var ErrVehicleBusy = errors.New("vehicle busy")

// TripInput ของที่พนักงานส่งมาตอนเพิ่มรอบ handler ตรวจมาแล้ว (ตอนแก้ใช้แค่ DepartAt กับ PriceBaht)
type TripInput struct {
	RouteID   int
	VehicleID int
	DepartAt  time.Time
	PriceBaht int
}

// Passenger หนึ่งการจองในรายชื่อผู้โดยสาร (schema Passenger ใน openapi.yaml)
type Passenger struct {
	BookingID int64     `json:"bookingId"`
	Member    Person    `json:"member"`
	Seats     []int16   `json:"seats"`
	TotalBaht int       `json:"totalBaht"`
	CreatedAt time.Time `json:"createdAt"`
}

// tripWriteErr แปล error จากฐานข้อมูลตอนเพิ่ม/แก้รอบ เป็นโน้ตที่ handler เข้าใจ
func tripWriteErr(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return ErrBadRef
		case "23505":
			return ErrVehicleBusy
		}
	}
	return err
}

// ListAllTrips ทุกรอบ รวมที่ยกเลิกและออกไปแล้ว ทีละหน้า
// เลือกวัน = เรียงตามเวลาออกของวันนั้น, ไม่เลือก = รอบที่ออกล่าสุดก่อน (ใหม่ ๆ อยู่บน)
func (s *Store) ListAllTrips(ctx context.Context, f TripFilter, page, pageSize int) ([]Trip, int, error) {
	const where = ` WHERE ($1 = 0 OR t.route_id = $1)
		AND ($2::date IS NULL OR (
		      t.depart_at >= $2::date::timestamp AT TIME ZONE 'Asia/Bangkok'
		  AND t.depart_at <  ($2::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok'))`
	args := []any{f.RouteID, f.Date}

	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM trips t`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := ` ORDER BY t.depart_at DESC, t.id DESC`
	if f.Date != nil {
		order = ` ORDER BY t.depart_at, t.id`
	}
	rows, err := s.Pool.Query(ctx, `SELECT `+tripCols+tripFrom+where+order+` LIMIT $3 OFFSET $4`,
		append(args, pageSize, (page-1)*pageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []Trip{}
	for rows.Next() {
		t, err := scanTrip(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, t)
	}
	return out, total, rows.Err()
}

// CreateTrip เพิ่มรอบรถ
func (s *Store) CreateTrip(ctx context.Context, in TripInput) (Trip, error) {
	var id int64
	err := s.Pool.QueryRow(ctx,
		`INSERT INTO trips (route_id, vehicle_id, depart_at, price_baht) VALUES ($1, $2, $3, $4) RETURNING id`,
		in.RouteID, in.VehicleID, in.DepartAt, in.PriceBaht).Scan(&id)
	if err != nil {
		return Trip{}, tripWriteErr(err)
	}
	return s.TripByID(ctx, id)
}

// UpdateTrip แก้เวลาออกและราคา เฉพาะรอบที่ยังเปิดอยู่ (ยังไม่ออก ไม่ถูกยกเลิก)
// ไม่มี id นี้ → ErrNotFound, รอบปิดแล้ว → ErrTripClosed
func (s *Store) UpdateTrip(ctx context.Context, id int64, departAt time.Time, price int) (Trip, error) {
	// เงื่อนไขอยู่ใน WHERE ของ UPDATE เลย: ตรวจกับแก้เป็นคำสั่งเดียว ไม่มีช่องให้สถานะเปลี่ยนระหว่างกลาง
	tag, err := s.Pool.Exec(ctx,
		`UPDATE trips SET depart_at = $2, price_baht = $3, updated_at = now()
		  WHERE id = $1 AND status = 'scheduled' AND depart_at > now()`, id, departAt, price)
	if err != nil {
		return Trip{}, tripWriteErr(err)
	}
	if tag.RowsAffected() == 0 {
		// แก้ไม่ได้สักแถว: ไม่มีรอบนี้ หรือมีแต่ปิดไปแล้ว ถามอีกทีว่าเป็นแบบไหน
		if _, err := s.TripByID(ctx, id); err != nil {
			return Trip{}, err
		}
		return Trip{}, ErrTripClosed
	}
	return s.TripByID(ctx, id)
}

// CancelTrip ยกเลิกรอบ พร้อมยกเลิกทุกการจองในรอบนี้และปล่อยที่นั่ง (transaction เดียว)
func (s *Store) CancelTrip(ctx context.Context, id int64) (Trip, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return Trip{}, err
	}
	defer tx.Rollback(ctx)

	// FOR UPDATE ต้องรอให้การจองที่ถือ FOR SHARE ของรอบนี้อยู่ (ดู CreateBooking) จบก่อน
	// และระหว่างที่ถือล็อกนี้ จะไม่มีการจองใหม่เข้ามาได้ จนกว่ายกเลิกเสร็จ
	var status string
	var departed bool
	err = tx.QueryRow(ctx, `SELECT status, depart_at <= now() FROM trips WHERE id = $1 FOR UPDATE`, id).Scan(&status, &departed)
	if errors.Is(err, pgx.ErrNoRows) {
		return Trip{}, ErrNotFound
	}
	if err != nil {
		return Trip{}, err
	}
	if status != "scheduled" || departed {
		return Trip{}, ErrTripClosed
	}

	for _, sql := range []string{
		`UPDATE trips SET status = 'cancelled', updated_at = now() WHERE id = $1`,
		`UPDATE bookings SET status = 'cancelled', cancelled_at = now(), updated_at = now()
		  WHERE trip_id = $1 AND status = 'confirmed'`,
		`UPDATE booking_seats SET released = true WHERE trip_id = $1 AND NOT released`,
	} {
		if _, err := tx.Exec(ctx, sql, id); err != nil {
			return Trip{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Trip{}, err
	}
	return s.TripByID(ctx, id)
}

// TripPassengers การจองที่ยังไม่ยกเลิกของรอบ เรียงตามเลขที่นั่งแรกของแต่ละการจอง
func (s *Store) TripPassengers(ctx context.Context, tripID int64) ([]Passenger, error) {
	rows, err := s.Pool.Query(ctx,
		`SELECT b.id, m.id, m.display_name, m.phone, b.total_baht, b.created_at,
		        ARRAY(SELECT bs.seat_no FROM booking_seats bs WHERE bs.booking_id = b.id ORDER BY bs.seat_no)
		   FROM bookings b JOIN members m ON m.id = b.member_id
		  WHERE b.trip_id = $1 AND b.status = 'confirmed'
		  ORDER BY (SELECT min(bs.seat_no) FROM booking_seats bs WHERE bs.booking_id = b.id), b.id`, tripID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Passenger{}
	for rows.Next() {
		var p Passenger
		if err := rows.Scan(&p.BookingID, &p.Member.ID, &p.Member.DisplayName, &p.Member.Phone,
			&p.TotalBaht, &p.CreatedAt, &p.Seats); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ListVehicles คันรถทั้งหมด เรียงตาม id
func (s *Store) ListVehicles(ctx context.Context) ([]Vehicle, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id, plate, kind, seat_count FROM vehicles ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Vehicle{}
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.Plate, &v.Kind, &v.SeatCount); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
