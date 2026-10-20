-- =====================================================================
-- seed.sql : ข้อมูลตัวอย่าง สำหรับทดสอบและใช้ทำหน้าเว็บ
--   psql "$DATABASE_URL" -f seed.sql
--
-- บัญชีทดสอบทุกบัญชีใช้รหัสผ่าน  password123  (เก็บเป็น bcrypt cost 10)
--   admin@tremproject.test  แอดมิน
--   staff@tremproject.test  staff (พนักงานขายตั๋ว)
--   nida@example.com        member (จองไว้แล้ว 2 ที่นั่ง)
--   ton@example.com         member
--
-- เวลาออกของรอบรถคิดจาก "วันนี้" ตามเวลาไทย รันวันไหนก็มีรอบในอนาคตให้จองเสมอ
-- =====================================================================

BEGIN;

-- ล้างข้อมูลเดิมและรีเซ็ตเลข id ให้เริ่มที่ 1 ทุกครั้ง
TRUNCATE booking_seats, bookings, trips, vehicles, routes,
         articles, members RESTART IDENTITY CASCADE;

-- สมาชิก (hash ของ password123) -----------------------------------------
INSERT INTO members (email, password_hash, display_name, phone, role) VALUES
    ('admin@tremproject.test', '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'แอดมิน',       NULL,         'admin'),  -- 1
    ('staff@tremproject.test', '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'พนักงานขายตั๋ว', '0812345678', 'staff'),  -- 2
    ('nida@example.com',       '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'นิดา',          '0898765432', 'member'), -- 3
    ('ton@example.com',        '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'ต้น',           '0861112222', 'member'); -- 4

-- ข่าว/ประกาศ ------------------------------------------------------------
INSERT INTO articles (author_id, title, body, published) VALUES
    (1, 'เปิดเส้นทางใหม่ กรุงเทพฯ – หัวหิน', 'เริ่มให้บริการทุกวัน วันละ 2 รอบ ...', true),
    (2, 'ควรมาถึงจุดขึ้นรถก่อนเวลากี่นาที', 'แนะนำให้มาก่อนรถออกอย่างน้อย 15 นาที ...', true),
    (1, 'ร่าง: งดเดินรถช่วงสงกรานต์', 'รอยืนยันวันที่ ...', false);

-- เส้นทาง ----------------------------------------------------------------
INSERT INTO routes (origin, destination, duration_min) VALUES
    ('กรุงเทพฯ (หมอชิต)', 'นครปฐม',         60),  -- 1
    ('นครปฐม',          'กรุงเทพฯ (หมอชิต)', 60),  -- 2
    ('กรุงเทพฯ (สายใต้)', 'หัวหิน',          180), -- 3
    ('กรุงเทพฯ (หมอชิต)', 'เชียงใหม่',        600); -- 4

-- คันรถ -----------------------------------------------------------------
INSERT INTO vehicles (plate, kind, seat_count) VALUES
    ('10-1234 กทม', 'van', 13),  -- 1
    ('10-5678 กทม', 'van', 13),  -- 2
    ('15-9999 กทม', 'bus', 40);  -- 3

-- รอบรถ (d = เที่ยงคืนของวันนี้ตามเวลาไทย) ---------------------------------
WITH d AS (SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AS today)
INSERT INTO trips (route_id, vehicle_id, depart_at, price_baht, status)
SELECT v.route_id, v.vehicle_id, (d.today + v.offs) AT TIME ZONE 'Asia/Bangkok', v.price, v.status
FROM d, (VALUES
    (1, 1, interval '1 day 07:00', 80,  'scheduled'),  -- 1 พรุ่งนี้ 07:00 หมอชิต→นครปฐม (มีคนจองแล้ว)
    (1, 2, interval '1 day 09:00', 80,  'scheduled'),  -- 2
    (2, 1, interval '1 day 17:00', 80,  'scheduled'),  -- 3 ขากลับ
    (3, 2, interval '2 days 08:00', 250, 'scheduled'), -- 4
    (4, 3, interval '2 days 20:00', 650, 'scheduled'), -- 5 รถทัวร์ 40 ที่นั่ง
    (1, 2, interval '3 days 07:00', 80,  'cancelled'), -- 6 รอบที่ถูกยกเลิก
    (1, 1, interval '-1 day 07:00', 80,  'scheduled')  -- 7 รอบที่ออกไปแล้ว (เมื่อวาน)
) AS v(route_id, vehicle_id, offs, price, status);

-- การจอง ----------------------------------------------------------------
INSERT INTO bookings (trip_id, member_id, total_baht, status, cancelled_at) VALUES
    (1, 3, 160, 'confirmed', NULL),                       -- 1 นิดา 2 ที่นั่ง
    (1, 4, 80,  'confirmed', NULL),                       -- 2 ต้น 1 ที่นั่ง
    (5, 4, 650, 'cancelled', now() - interval '1 hour'),  -- 3 ต้นยกเลิกไปแล้ว ที่นั่งว่าง
    (7, 3, 80,  'confirmed', NULL);                       -- 4 นิดา รอบเมื่อวาน (ประวัติ)

INSERT INTO booking_seats (booking_id, trip_id, seat_no, released) VALUES
    (1, 1, 1,  false),
    (1, 1, 2,  false),
    (2, 1, 5,  false),
    (3, 5, 12, true),
    (4, 7, 3,  false);

COMMIT;
