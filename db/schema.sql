-- =====================================================================
-- schema.sql : ระบบจองที่นั่งรถทัวร์ / รถตู้
-- วิชา 520342 Server Side Web Programming
--
-- รันซ้ำได้: ลบตารางเดิมทิ้งก่อนแล้วสร้างใหม่ทั้งหมด
--   psql "$DATABASE_URL" -f schema.sql
--
-- เส้นเรื่องของข้อมูล
--   routes (เส้นทาง) + vehicles (คันรถ) → trips (รอบรถ: เส้นทางไหน คันไหน ออกกี่โมง ราคาเท่าไร)
--   trips ← bookings (สมาชิกจอง 1 ครั้ง) ← booking_seats (ที่นั่งในการจองนั้น ทีละเลขที่นั่ง)
-- =====================================================================

BEGIN;

-- ลบตารางของหัวข้อเก่า (PetFinder) ด้วย ฐานข้อมูลที่เคยรัน schema เดิมจะได้ไม่มีขยะค้าง
DROP TABLE IF EXISTS adoption_updates, adoption_requests, adoption_listings,
                     sightings, found_reports, lost_reports, areas, species CASCADE;
DROP TABLE IF EXISTS booking_seats, bookings, trips, vehicles, routes,
                     articles, members CASCADE;

-- ---------------------------------------------------------------------
-- 1) สมาชิก : ทุกคนสมัครได้ role = 'member' (ผู้โดยสาร)
--    แอดมินเลื่อนเป็น 'staff' (พนักงานขายตั๋ว/เช็กผู้โดยสาร) หรือ 'admin'
-- ---------------------------------------------------------------------
CREATE TABLE members (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL CHECK (length(email) <= 255),
    password_hash TEXT        NOT NULL,                        -- bcrypt เท่านั้น ห้ามเก็บรหัสจริง
    display_name  TEXT        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
    phone         TEXT,                                        -- ไว้ติดต่อผู้โดยสารเมื่อรถเลื่อน/ยกเลิก
    role          TEXT        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('member', 'staff', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- อีเมลห้ามซ้ำแบบไม่สนตัวพิมพ์เล็กใหญ่ (ซ้ำ → รหัส 23505 → ตอบ 409 EMAIL_TAKEN)
CREATE UNIQUE INDEX members_email_lower_uq ON members (lower(email));

-- ---------------------------------------------------------------------
-- 2) ข่าว/ประกาศ เช่น เปิดเส้นทางใหม่ งดเดินรถช่วงสงกรานต์
-- ---------------------------------------------------------------------
CREATE TABLE articles (
    id         BIGSERIAL PRIMARY KEY,
    author_id  BIGINT      NOT NULL REFERENCES members(id),
    title      TEXT        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    body       TEXT        NOT NULL,
    cover_url  TEXT,
    published  BOOLEAN     NOT NULL DEFAULT false,             -- false = ฉบับร่าง หน้าบ้านไม่เห็น
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3) เส้นทาง เช่น กรุงเทพฯ (หมอชิต) → นครปฐม
--    ขาไปกับขากลับนับเป็นคนละเส้นทาง
-- ---------------------------------------------------------------------
CREATE TABLE routes (
    id           SMALLSERIAL PRIMARY KEY,
    origin       TEXT        NOT NULL CHECK (length(origin) BETWEEN 1 AND 100),
    destination  TEXT        NOT NULL CHECK (length(destination) BETWEEN 1 AND 100),
    duration_min SMALLINT    NOT NULL CHECK (duration_min > 0),   -- เวลาเดินทางโดยประมาณ (นาที)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (origin, destination),
    CHECK (origin <> destination)
);

-- ---------------------------------------------------------------------
-- 4) คันรถ : van หรือ bus จำนวนที่นั่งเป็นตัวกำหนดเลขที่นั่ง 1..seat_count
--    หน้าเว็บใช้ kind เลือกผังที่นั่ง (รถตู้ 3 ที่/แถว, รถทัวร์ 2+2 มีทางเดินกลาง)
-- ---------------------------------------------------------------------
CREATE TABLE vehicles (
    id         SMALLSERIAL PRIMARY KEY,
    plate      TEXT        NOT NULL UNIQUE,                    -- ทะเบียนรถ
    kind       TEXT        NOT NULL CHECK (kind IN ('van', 'bus')),
    seat_count SMALLINT    NOT NULL CHECK (seat_count BETWEEN 1 AND 60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5) รอบรถ : เส้นทางไหน ใช้คันไหน ออกเวลาเท่าไร ราคาที่นั่งละเท่าไร
--    ราคาเก็บเป็นบาทจำนวนเต็ม (ค่าโดยสารไม่มีสตางค์ และห้ามใช้ float กับเงิน)
--    สถานะ: scheduled (เปิดขาย) / cancelled (ยกเลิกรอบ)
-- ---------------------------------------------------------------------
CREATE TABLE trips (
    id         BIGSERIAL PRIMARY KEY,
    route_id   SMALLINT    NOT NULL REFERENCES routes(id),
    vehicle_id SMALLINT    NOT NULL REFERENCES vehicles(id),
    depart_at  TIMESTAMPTZ NOT NULL,
    price_baht INTEGER     NOT NULL CHECK (price_baht >= 0),
    status     TEXT        NOT NULL DEFAULT 'scheduled'
                           CHECK (status IN ('scheduled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vehicle_id, depart_at)                             -- รถคันเดียวออกสองรอบเวลาเดียวกันไม่ได้
);
-- หน้าค้นหารอบ: เลือกเส้นทาง + วันที่ → กรองด้วย route_id แล้วเรียงตามเวลาออก
CREATE INDEX trips_route_depart_idx ON trips (route_id, depart_at);

-- ---------------------------------------------------------------------
-- 6) การจอง : สมาชิกหนึ่งคนจองได้หลายที่นั่งในครั้งเดียว
--    total_baht = ราคาตอนจอง x จำนวนที่นั่ง (เก็บไว้ ถึงรอบรถจะเปลี่ยนราคาทีหลังยอดก็ไม่เพี้ยน)
--    สถานะ: confirmed (จองแล้ว) / cancelled (ยกเลิก ที่นั่งกลับมาว่าง)
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
    id           BIGSERIAL PRIMARY KEY,
    trip_id      BIGINT      NOT NULL REFERENCES trips(id),
    member_id    BIGINT      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    total_baht   INTEGER     NOT NULL CHECK (total_baht >= 0),
    status       TEXT        NOT NULL DEFAULT 'confirmed'
                             CHECK (status IN ('confirmed', 'cancelled')),
    cancelled_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
    UNIQUE (id, trip_id)                                       -- ให้ booking_seats อ้างอิงคู่ (id, trip_id) ได้
);
CREATE INDEX bookings_member_idx ON bookings (member_id, created_at DESC);  -- หน้า "การจองของฉัน"
CREATE INDEX bookings_trip_idx   ON bookings (trip_id);                     -- staff ดูรายชื่อผู้โดยสารของรอบ

-- ---------------------------------------------------------------------
-- 7) ที่นั่งในแต่ละการจอง : หนึ่งแถว = หนึ่งที่นั่ง
--    เก็บ trip_id ซ้ำไว้ตรงนี้เพื่อทำ unique index ข้างล่างได้
--    FK แบบคู่ (booking_id, trip_id) บังคับว่า trip_id ต้องตรงกับของการจองเสมอ
--    เลขที่นั่งต้องไม่เกิน seat_count ของรถ → ตรวจใน Go ตอนจอง
-- ---------------------------------------------------------------------
CREATE TABLE booking_seats (
    booking_id BIGINT   NOT NULL,
    trip_id    BIGINT   NOT NULL,
    seat_no    SMALLINT NOT NULL CHECK (seat_no > 0),
    released   BOOLEAN  NOT NULL DEFAULT false,                -- true = ยกเลิกแล้ว ที่นั่งนี้ว่างให้คนอื่นจองได้
    PRIMARY KEY (booking_id, seat_no),
    FOREIGN KEY (booking_id, trip_id) REFERENCES bookings (id, trip_id) ON DELETE CASCADE
);
-- ★ หัวใจของระบบ: ที่นั่งเดียวกันในรอบเดียวกัน มีคนถือได้แค่คนเดียว
--   ถ้าสองคนกดจองที่นั่งเดียวกันพร้อมกัน คนที่สองจะได้รหัส 23505 → ตอบ 409 SEAT_TAKEN
--   แถวที่ released แล้วไม่นับ ที่นั่งที่ถูกยกเลิกจึงจองใหม่ได้
CREATE UNIQUE INDEX booking_seats_one_holder_uq
    ON booking_seats (trip_id, seat_no) WHERE NOT released;

COMMIT;
