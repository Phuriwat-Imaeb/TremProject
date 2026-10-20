package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// งานหลังบ้านของ admin: จัดการเส้นทางและคันรถ

// ErrDuplicate ชน UNIQUE (เส้นทางต้นทาง-ปลายทางเดิม หรือทะเบียนรถเดิม) handler แปลเป็น 409 DUPLICATE
var ErrDuplicate = errors.New("duplicate")

// ErrInUse ยังมีรอบรถอ้างถึงอยู่ (ชน foreign key ตอนลบ 23503) handler แปลเป็น 409 IN_USE
var ErrInUse = errors.New("in use")

// SeatsInUseError ลดจำนวนที่นั่งแล้วชนกับที่นั่งที่มีคนจองไว้ในรอบที่ยังไม่ออก handler แปลเป็น 409 SEATS_IN_USE
type SeatsInUseError struct{ Seat int16 }

func (e SeatsInUseError) Error() string { return fmt.Sprintf("seat %d in use", e.Seat) }

// RouteInput / VehicleInput ของที่ admin ส่งมา handler ตรวจและตัดช่องว่างมาแล้ว
type RouteInput struct {
	Origin      string
	Destination string
	DurationMin int16
}

type VehicleInput struct {
	Plate     string
	Kind      string
	SeatCount int16
}

// fleetErr แปล error ของฐานข้อมูลที่เจอได้ตอนเพิ่ม/แก้/ลบ เส้นทางหรือคันรถ
func fleetErr(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return ErrDuplicate
		case "23503":
			return ErrInUse
		}
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// deleteByID ลบหนึ่งแถว ไม่มี id นี้ → ErrNotFound มีรอบรถอ้างถึง → ErrInUse
// table มาจากโค้ดเราเอง ("routes"/"vehicles") ไม่ใช่จากผู้ใช้ ต่อ string ได้ไม่เสี่ยง SQL injection
func (s *Store) deleteByID(ctx context.Context, table string, id int64) error {
	tag, err := s.Pool.Exec(ctx, `DELETE FROM `+table+` WHERE id = $1`, id)
	if err != nil {
		return fleetErr(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- เส้นทาง ----------

func (s *Store) CreateRoute(ctx context.Context, in RouteInput) (Route, error) {
	r := Route{Origin: in.Origin, Destination: in.Destination, DurationMin: in.DurationMin}
	err := s.Pool.QueryRow(ctx,
		`INSERT INTO routes (origin, destination, duration_min) VALUES ($1, $2, $3) RETURNING id`,
		in.Origin, in.Destination, in.DurationMin).Scan(&r.ID)
	return r, fleetErr(err)
}

// UpdateRoute แก้เส้นทาง รอบรถที่ใช้เส้นทางนี้เห็นชื่อใหม่ทันที (trips เก็บแค่ route_id)
func (s *Store) UpdateRoute(ctx context.Context, id int64, in RouteInput) (Route, error) {
	r := Route{Origin: in.Origin, Destination: in.Destination, DurationMin: in.DurationMin}
	err := s.Pool.QueryRow(ctx,
		`UPDATE routes SET origin = $2, destination = $3, duration_min = $4, updated_at = now()
		  WHERE id = $1 RETURNING id`, id, in.Origin, in.Destination, in.DurationMin).Scan(&r.ID)
	return r, fleetErr(err)
}

// DeleteRoute ลบได้เฉพาะเส้นทางที่ยังไม่เคยมีรอบรถ (FK ของ trips กันไว้ให้)
func (s *Store) DeleteRoute(ctx context.Context, id int64) error {
	return s.deleteByID(ctx, "routes", id)
}

// ---------- คันรถ ----------

func (s *Store) CreateVehicle(ctx context.Context, in VehicleInput) (Vehicle, error) {
	v := Vehicle{Plate: in.Plate, Kind: in.Kind, SeatCount: in.SeatCount}
	err := s.Pool.QueryRow(ctx,
		`INSERT INTO vehicles (plate, kind, seat_count) VALUES ($1, $2, $3) RETURNING id`,
		in.Plate, in.Kind, in.SeatCount).Scan(&v.ID)
	return v, fleetErr(err)
}

// UpdateVehicle แก้คันรถ ถ้าลดที่นั่ง ต้องไม่มีใครถือเลขที่เกินจำนวนใหม่ในรอบที่ยังไม่ออก
func (s *Store) UpdateVehicle(ctx context.Context, id int64, in VehicleInput) (Vehicle, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return Vehicle{}, err
	}
	defer tx.Rollback(ctx)

	// ล็อกแถวรถ: CreateBooking ถือ FOR SHARE ของรถคันนี้อยู่ตอนตรวจเลขที่นั่ง
	// จึงไม่มีใครจองที่นั่งเลขสูงหลุดเข้ามาระหว่างที่เราตรวจและลดจำนวนที่นั่ง
	if err := tx.QueryRow(ctx, `SELECT id FROM vehicles WHERE id = $1 FOR UPDATE`, id).Scan(new(int16)); err != nil {
		return Vehicle{}, fleetErr(err)
	}
	var maxHeld *int16 // NULL = ไม่มีใครจองอะไรไว้เลย
	err = tx.QueryRow(ctx,
		`SELECT max(bs.seat_no)
		   FROM booking_seats bs JOIN trips t ON t.id = bs.trip_id
		  WHERE t.vehicle_id = $1 AND NOT bs.released
		    AND t.status = 'scheduled' AND t.depart_at > now()`, id).Scan(&maxHeld)
	if err != nil {
		return Vehicle{}, err
	}
	if maxHeld != nil && *maxHeld > in.SeatCount {
		return Vehicle{}, SeatsInUseError{Seat: *maxHeld}
	}

	if _, err := tx.Exec(ctx,
		`UPDATE vehicles SET plate = $2, kind = $3, seat_count = $4, updated_at = now() WHERE id = $1`,
		id, in.Plate, in.Kind, in.SeatCount); err != nil {
		return Vehicle{}, fleetErr(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Vehicle{}, err
	}
	return Vehicle{ID: int16(id), Plate: in.Plate, Kind: in.Kind, SeatCount: in.SeatCount}, nil
}

// DeleteVehicle ลบได้เฉพาะคันที่ยังไม่เคยมีรอบรถ
func (s *Store) DeleteVehicle(ctx context.Context, id int64) error {
	return s.deleteByID(ctx, "vehicles", id)
}
