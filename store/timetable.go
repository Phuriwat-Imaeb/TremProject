package store

import (
	"context"
	"time"
)

// ตารางเดินรถประจำวัน: ทุกวันรถแต่ละคันออกตามเวลาเดิม
// อ้างเส้นทางด้วยต้นทาง/ปลายทาง และอ้างรถด้วยทะเบียน (ไม่ผูกกับเลข id)
// ถ้าแอดมินลบเส้นทางหรือรถคันไหนไป แถวนั้นก็แค่ถูกข้ามไป
const timetableSQL = `
WITH slot(origin, destination, plate, depart_time, price) AS (VALUES
    ('กรุงเทพฯ (หมอชิต)', 'นครปฐม',          '10-1234 กทม', time '07:00', 80),
    ('นครปฐม',          'กรุงเทพฯ (หมอชิต)', '10-1234 กทม', time '09:00', 80),
    ('กรุงเทพฯ (หมอชิต)', 'นครปฐม',          '10-1234 กทม', time '12:00', 80),
    ('นครปฐม',          'กรุงเทพฯ (หมอชิต)', '10-1234 กทม', time '17:00', 80),
    ('กรุงเทพฯ (หมอชิต)', 'นครปฐม',          '10-5678 กทม', time '09:00', 80),
    ('กรุงเทพฯ (สายใต้)', 'หัวหิน',           '10-5678 กทม', time '13:00', 250),
    ('กรุงเทพฯ (หมอชิต)', 'เชียงใหม่',         '15-9999 กทม', time '20:00', 650)
),
day AS (
    -- วันนี้ถึงอีก $1 วันข้างหน้า ตามเวลาไทย
    SELECT d::date AS d
    FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date,
                         (now() AT TIME ZONE 'Asia/Bangkok')::date + $1::int, interval '1 day') AS d
)
INSERT INTO trips (route_id, vehicle_id, depart_at, price_baht)
SELECT r.id, v.id, (day.d + s.depart_time) AT TIME ZONE 'Asia/Bangkok', s.price
FROM slot s
JOIN routes   r ON r.origin = s.origin AND r.destination = s.destination
JOIN vehicles v ON v.plate = s.plate
CROSS JOIN day
WHERE (day.d + s.depart_time) AT TIME ZONE 'Asia/Bangkok' > now()
-- รอบที่มีอยู่แล้ว (รวมรอบที่ staff ยกเลิกไป) ไม่สร้างซ้ำ เพราะ UNIQUE (vehicle_id, depart_at)
ON CONFLICT (vehicle_id, depart_at) DO NOTHING`

// FillTimetable สร้างรอบรถตามตารางประจำวัน ล่วงหน้า days วัน
// เรียกซ้ำกี่ครั้งก็ได้ รอบที่มีแล้วจะไม่ถูกสร้างซ้ำ คืนจำนวนรอบที่สร้างใหม่
func (s *Store) FillTimetable(ctx context.Context, days int) (int64, error) {
	tag, err := s.Pool.Exec(ctx, timetableSQL, days)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// KeepTimetableFilled เติมรอบรถทันที แล้วเติมซ้ำทุก every จนกว่า ctx จะถูกยกเลิก
// ทำให้หน้าค้นหามีรอบให้เลือกเสมอ ไม่ว่าจะเลือกวันไหนในช่วง days วันข้างหน้า
func (s *Store) KeepTimetableFilled(ctx context.Context, days int, every time.Duration, logf func(string, ...any)) {
	fill := func() {
		n, err := s.FillTimetable(ctx, days)
		if err != nil {
			logf("เติมตารางเดินรถไม่สำเร็จ: %v", err)
			return
		}
		if n > 0 {
			logf("เติมตารางเดินรถ %d รอบ (ล่วงหน้า %d วัน)", n, days)
		}
	}
	fill()
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			fill()
		}
	}
}
