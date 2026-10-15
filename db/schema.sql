-- =====================================================================
-- schema.sql : ระบบตามหาสัตว์หาย + หาบ้านใหม่ (Pet Finder & Adoption)
-- วิชา 520342 Server Side Web Programming
--
-- รันซ้ำได้: ลบตารางเดิมทิ้งก่อนแล้วสร้างใหม่ทั้งหมด
--   psql "$DATABASE_URL" -f schema.sql
--
-- เส้นเรื่องของข้อมูล
--   lost_reports  (เจ้าของประกาศสัตว์หาย) ← sightings (คนแจ้งพบเห็น)
--   found_reports (คนเก็บสัตว์หลงได้)  → ถ้าเจ้าของมารับ ผูกกับ lost_report
--                                     → ถ้าครบกำหนดไม่มีเจ้าของ ย้ายไป adoption_listings
--   adoption_listings → adoption_requests (ยื่นขอรับเลี้ยง) → adoption_updates (ติดตามผล)
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS adoption_updates, adoption_requests, adoption_listings,
                     sightings, found_reports, lost_reports,
                     articles, areas, species, members CASCADE;

-- ---------------------------------------------------------------------
-- 1) สมาชิก : ทุกคนสมัครได้ role = 'member'
--    แอดมินเลื่อนเป็น 'rescuer' (ผู้ช่วยเหลือสัตว์/มูลนิธิที่ยืนยันแล้ว) หรือ 'admin'
-- ---------------------------------------------------------------------
CREATE TABLE members (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL CHECK (length(email) <= 255),
    password_hash TEXT        NOT NULL,                        -- bcrypt เท่านั้น ห้ามเก็บรหัสจริง
    display_name  TEXT        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
    phone         TEXT,                                        -- ไว้ให้ติดต่อกลับเรื่องสัตว์
    role          TEXT        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('member', 'rescuer', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- อีเมลห้ามซ้ำแบบไม่สนตัวพิมพ์เล็กใหญ่ (ซ้ำ → รหัส 23505 → ตอบ 409 EMAIL_TAKEN)
CREATE UNIQUE INDEX members_email_lower_uq ON members (lower(email));

-- ---------------------------------------------------------------------
-- 2) ข้อมูลหลักที่แอดมินจัดการจากหลังบ้าน (content management)
-- ---------------------------------------------------------------------
CREATE TABLE species (                -- ชนิดสัตว์: หมา แมว ...
    id      SMALLSERIAL PRIMARY KEY,
    name_th TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE
);

CREATE TABLE areas (                  -- พื้นที่ ใช้กรองและจับคู่ หาย↔พบ
    id   SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE articles (               -- ข่าว/บทความ เช่น วิธีดูแลแมวจร
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
-- 3) ประกาศสัตว์หาย (เจ้าของเป็นคนโพสต์)
--    สถานะ: lost (ยังหาอยู่) → reunited (ได้คืนแล้ว) / closed (ปิดประกาศ)
-- ---------------------------------------------------------------------
CREATE TABLE lost_reports (
    id           BIGSERIAL PRIMARY KEY,
    owner_id     BIGINT      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    species_id   SMALLINT    NOT NULL REFERENCES species(id),
    area_id      SMALLINT    NOT NULL REFERENCES areas(id),
    pet_name     TEXT        NOT NULL CHECK (length(pet_name) BETWEEN 1 AND 50),
    sex          TEXT        NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    color        TEXT        NOT NULL,                         -- ใช้จับคู่: ส้ม ดำ ขาว สามสี ...
    description  TEXT        NOT NULL DEFAULT '',              -- ลักษณะเด่น ปลอกคอ แผลเป็น
    photo_url    TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL,                         -- หายล่าสุดเมื่อไหร่
    status       TEXT        NOT NULL DEFAULT 'lost'
                             CHECK (status IN ('lost', 'reunited', 'closed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (last_seen_at <= created_at + interval '1 hour')     -- ห้ามหายในอนาคต
);
-- หน้าค้นหาจะกรองด้วย สถานะ + ชนิด + พื้นที่ บ่อยที่สุด
CREATE INDEX lost_reports_search_idx ON lost_reports (status, species_id, area_id);

-- ---------------------------------------------------------------------
-- 4) แจ้งพบเห็น (ใครก็ได้ที่ล็อกอินแล้ว แจ้งว่าเห็นสัตว์ในประกาศหาย)
--    lat/lng ไม่บังคับ ไว้ทำแผนที่ในเฟสเสริม
-- ---------------------------------------------------------------------
CREATE TABLE sightings (
    id             BIGSERIAL PRIMARY KEY,
    lost_report_id BIGINT       NOT NULL REFERENCES lost_reports(id) ON DELETE CASCADE,
    reporter_id    BIGINT       NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    area_id        SMALLINT     NOT NULL REFERENCES areas(id),
    seen_at        TIMESTAMPTZ  NOT NULL,
    note           TEXT         NOT NULL DEFAULT '',
    photo_url      TEXT,
    lat            NUMERIC(9,6) CHECK (lat BETWEEN -90 AND 90),
    lng            NUMERIC(9,6) CHECK (lng BETWEEN -180 AND 180),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX sightings_report_idx ON sightings (lost_report_id, seen_at DESC);

-- ---------------------------------------------------------------------
-- 5) ประกาศพบสัตว์หลง (คนเก็บได้เป็นคนโพสต์)
--    สถานะ: waiting_owner (รอเจ้าของ) → returned (คืนเจ้าของแล้ว)
--                                    → for_adoption (ครบกำหนด ย้ายไปหาบ้านใหม่)
-- ---------------------------------------------------------------------
CREATE TABLE found_reports (
    id             BIGSERIAL PRIMARY KEY,
    finder_id      BIGINT      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    species_id     SMALLINT    NOT NULL REFERENCES species(id),
    area_id        SMALLINT    NOT NULL REFERENCES areas(id),
    sex            TEXT        NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    color          TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    photo_url      TEXT,
    found_at       TIMESTAMPTZ NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'waiting_owner'
                               CHECK (status IN ('waiting_owner', 'returned', 'for_adoption')),
    lost_report_id BIGINT      REFERENCES lost_reports(id) ON DELETE SET NULL, -- ผูกเมื่อเจ้าของมารับ
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ถ้าสถานะ returned ต้องบอกได้ว่าคืนให้ประกาศหายใบไหน
    CHECK (status <> 'returned' OR lost_report_id IS NOT NULL)
);
CREATE INDEX found_reports_search_idx ON found_reports (status, species_id, area_id);

-- ---------------------------------------------------------------------
-- 6) ประกาศหาบ้านใหม่ (เฉพาะ rescuer/admin สร้างได้ — ตรวจใน Go ด้วย RequireRole)
--    found_report_id มีค่าเมื่อย้ายมาจากสัตว์หลงที่ไม่มีเจ้าของ (UNIQUE: ย้ายได้ครั้งเดียว)
--    สถานะ: open → pending (มีคำขอที่อนุมัติแล้ว รอส่งมอบ) → adopted / closed
-- ---------------------------------------------------------------------
CREATE TABLE adoption_listings (
    id              BIGSERIAL PRIMARY KEY,
    rescuer_id      BIGINT      NOT NULL REFERENCES members(id),
    found_report_id BIGINT      UNIQUE REFERENCES found_reports(id) ON DELETE SET NULL,
    species_id      SMALLINT    NOT NULL REFERENCES species(id),
    area_id         SMALLINT    NOT NULL REFERENCES areas(id),
    pet_name        TEXT        NOT NULL CHECK (length(pet_name) BETWEEN 1 AND 50),
    sex             TEXT        NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    age_months      SMALLINT    CHECK (age_months BETWEEN 0 AND 400),
    sterilized      BOOLEAN     NOT NULL DEFAULT false,        -- ทำหมันแล้ว
    vaccinated      BOOLEAN     NOT NULL DEFAULT false,        -- ฉีดวัคซีนแล้ว
    personality     TEXT        NOT NULL DEFAULT '',           -- นิสัย เช่น ขี้อ้อน เข้ากับเด็กได้
    photo_url       TEXT,
    status          TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'pending', 'adopted', 'closed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX adoption_listings_search_idx ON adoption_listings (status, species_id, area_id);

-- ---------------------------------------------------------------------
-- 7) คำขอรับเลี้ยง + แบบประเมินผู้รับเลี้ยง
--    สถานะ: pending → approved / rejected, หรือผู้ขอถอนเอง withdrawn
-- ---------------------------------------------------------------------
CREATE TABLE adoption_requests (
    id            BIGSERIAL PRIMARY KEY,
    listing_id    BIGINT      NOT NULL REFERENCES adoption_listings(id) ON DELETE CASCADE,
    applicant_id  BIGINT      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    housing_type  TEXT        NOT NULL CHECK (housing_type IN ('house', 'condo', 'dorm', 'other')),
    has_pets      BOOLEAN     NOT NULL DEFAULT false,          -- มีสัตว์เลี้ยงอยู่แล้วไหม
    has_experience BOOLEAN    NOT NULL DEFAULT false,          -- เคยเลี้ยงมาก่อนไหม
    hours_alone   SMALLINT    NOT NULL CHECK (hours_alone BETWEEN 0 AND 24), -- สัตว์ต้องอยู่ลำพังวันละกี่ชม.
    message       TEXT        NOT NULL CHECK (length(message) >= 20),       -- เหตุผลที่อยากรับเลี้ยง
    status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    decided_at    TIMESTAMPTZ,                                 -- เวลาที่ rescuer ตัดสิน
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, applicant_id)                          -- ขอตัวเดิมซ้ำไม่ได้ → 409
);
-- ★ หัวใจของระบบ: สัตว์หนึ่งตัวมีคำขอที่ "อนุมัติแล้ว" ได้แค่ใบเดียว
--   ถ้า rescuer สองคน (หรือกดสองแท็บ) อนุมัติพร้อมกัน ใบที่สองจะได้รหัส 23505
CREATE UNIQUE INDEX adoption_requests_one_approved_uq
    ON adoption_requests (listing_id) WHERE status = 'approved';

-- ---------------------------------------------------------------------
-- 8) ติดตามผลหลังรับเลี้ยง (ผู้รับเลี้ยงส่งรูป/ข้อความอัปเดต)
-- ---------------------------------------------------------------------
CREATE TABLE adoption_updates (
    id         BIGSERIAL PRIMARY KEY,
    request_id BIGINT      NOT NULL REFERENCES adoption_requests(id) ON DELETE CASCADE,
    note       TEXT        NOT NULL CHECK (length(note) >= 1),
    photo_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
