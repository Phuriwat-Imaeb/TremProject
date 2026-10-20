package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// Vehicle คันรถ หน้าตาตรงกับ schema Vehicle ใน openapi.yaml
type Vehicle struct {
	ID        int16  `json:"id"`
	Plate     string `json:"plate"`
	Kind      string `json:"kind"` // van หรือ bus
	SeatCount int16  `json:"seatCount"`
}

// Trip รอบรถ หน้าตาตรงกับ schema Trip ใน openapi.yaml
type Trip struct {
	ID        int64     `json:"id"`
	Route     Route     `json:"route"`
	Vehicle   Vehicle   `json:"vehicle"`
	DepartAt  time.Time `json:"departAt"`
	ArriveAt  time.Time `json:"arriveAt"`
	PriceBaht int       `json:"priceBaht"`
	Status    string    `json:"status"`
	Departed  bool      `json:"departed"`
	SeatsLeft int       `json:"seatsLeft"`
}

// SeatMap ผังที่นั่ง บอกแค่เลขที่ไม่ว่าง ไม่บอกว่าใครจอง (schema SeatMap ใน openapi.yaml)
type SeatMap struct {
	TripID    int64   `json:"tripId"`
	Kind      string  `json:"kind"`
	SeatCount int16   `json:"seatCount"`
	Taken     []int16 `json:"taken"`
}

// ทุก query ของรอบรถดึงคอลัมน์ชุดเดียวกัน พร้อมเส้นทาง คันรถ และจำนวนที่นั่งว่าง
//
//	arriveAt  = เวลาออก + เวลาเดินทางของเส้นทาง
//	departed  = เลยเวลาออกแล้ว (คิดจากนาฬิกาของฐานข้อมูล ทุกเครื่องได้คำตอบเดียวกัน)
//	seatsLeft = ที่นั่งทั้งหมด - ที่นั่งที่ยังมีคนถือ (แถวที่ released แล้วไม่นับ)
const tripCols = `t.id, r.id, r.origin, r.destination, r.duration_min,
	v.id, v.plate, v.kind, v.seat_count,
	t.depart_at, t.depart_at + r.duration_min * interval '1 minute',
	t.price_baht, t.status, t.depart_at <= now(),
	v.seat_count - (SELECT count(*) FROM booking_seats bs WHERE bs.trip_id = t.id AND NOT bs.released)`

const tripFrom = ` FROM trips t
	JOIN routes r ON r.id = t.route_id
	JOIN vehicles v ON v.id = t.vehicle_id`

func scanTrip(row pgx.Row) (Trip, error) {
	var t Trip
	err := row.Scan(&t.ID, &t.Route.ID, &t.Route.Origin, &t.Route.Destination, &t.Route.DurationMin,
		&t.Vehicle.ID, &t.Vehicle.Plate, &t.Vehicle.Kind, &t.Vehicle.SeatCount,
		&t.DepartAt, &t.ArriveAt, &t.PriceBaht, &t.Status, &t.Departed, &t.SeatsLeft)
	if errors.Is(err, pgx.ErrNoRows) {
		return Trip{}, ErrNotFound
	}
	return t, err
}

// TripFilter ตัวกรองหน้าค้นหารอบ handler ตรวจค่ามาแล้ว
type TripFilter struct {
	RouteID int     // 0 = ทุกเส้นทาง
	Date    *string // "YYYY-MM-DD" ตามเวลาไทย, nil = ไม่กรองวัน
}

// openTripLimit กันหน้าค้นหาแบบไม่เลือกวันดึงรอบรถมาทั้งปี
const openTripLimit = 50

// ListOpenTrips รอบที่ยังจองได้ (ยังไม่ออก และไม่ถูกยกเลิก) เรียงตามเวลาออก
func (s *Store) ListOpenTrips(ctx context.Context, f TripFilter) ([]Trip, error) {
	// วันที่ตามเวลาไทย แปลงเป็นช่วงเวลา [เที่ยงคืนวันนั้น, เที่ยงคืนวันถัดไป) แล้วเทียบกับ depart_at ตรง ๆ
	// (ไม่แปลง depart_at เป็นวันที่ทีละแถว index trips_route_depart_idx จึงยังช่วยค้นได้)
	rows, err := s.Pool.Query(ctx,
		`SELECT `+tripCols+tripFrom+`
		  WHERE t.status = 'scheduled' AND t.depart_at > now()
		    AND ($1 = 0 OR t.route_id = $1)
		    AND ($2::date IS NULL OR (
		          t.depart_at >= $2::date::timestamp AT TIME ZONE 'Asia/Bangkok'
		      AND t.depart_at <  ($2::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok'))
		  ORDER BY t.depart_at, t.id
		  LIMIT $3`, f.RouteID, f.Date, openTripLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Trip{}
	for rows.Next() {
		t, err := scanTrip(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// TripByID รอบรถหนึ่งรอบ รวมรอบที่ยกเลิกหรือออกไปแล้ว ไม่มี id นี้ → ErrNotFound
func (s *Store) TripByID(ctx context.Context, id int64) (Trip, error) {
	return scanTrip(s.Pool.QueryRow(ctx, `SELECT `+tripCols+tripFrom+` WHERE t.id = $1`, id))
}

// TripSeats ผังที่นั่งของรอบ ARRAY(...) ได้ {} เมื่อไม่มีใครจอง จึงไม่ต้องกลัว null
func (s *Store) TripSeats(ctx context.Context, id int64) (SeatMap, error) {
	m := SeatMap{TripID: id}
	err := s.Pool.QueryRow(ctx,
		`SELECT v.kind, v.seat_count,
		        ARRAY(SELECT bs.seat_no FROM booking_seats bs
		               WHERE bs.trip_id = t.id AND NOT bs.released
		               ORDER BY bs.seat_no)
		   FROM trips t JOIN vehicles v ON v.id = t.vehicle_id
		  WHERE t.id = $1`, id).Scan(&m.Kind, &m.SeatCount, &m.Taken)
	if errors.Is(err, pgx.ErrNoRows) {
		return SeatMap{}, ErrNotFound
	}
	return m, err
}
