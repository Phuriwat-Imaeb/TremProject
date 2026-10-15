-- =====================================================================
-- seed.sql : ข้อมูลตัวอย่าง สำหรับทดสอบและให้ทีม React ใช้ทำหน้าเว็บ
--   psql "$DATABASE_URL" -f seed.sql
--
-- บัญชีทดสอบทุกบัญชีใช้รหัสผ่าน  password123  (เก็บเป็น bcrypt cost 10)
--   admin@petfinder.test   แอดมิน
--   rescue@petfinder.test  rescuer (มูลนิธิ/ชมรมดูแลสัตว์)
--   nida@example.com       member (แมวหาย)
--   ton@example.com        member (เก็บสัตว์หลงได้ / อยากรับเลี้ยง)
-- =====================================================================

BEGIN;

-- ล้างข้อมูลเดิมและรีเซ็ตเลข id ให้เริ่มที่ 1 ทุกครั้ง
TRUNCATE adoption_updates, adoption_requests, adoption_listings,
         sightings, found_reports, lost_reports,
         articles, areas, species, members RESTART IDENTITY CASCADE;

-- ข้อมูลหลัก -----------------------------------------------------------
INSERT INTO species (name_th, name_en) VALUES
    ('สุนัข', 'dog'),        -- 1
    ('แมว', 'cat'),          -- 2
    ('กระต่าย', 'rabbit'),   -- 3
    ('อื่น ๆ', 'other');     -- 4

INSERT INTO areas (name) VALUES
    ('ม.ศิลปากร วิทยาเขตพระราชวังสนามจันทร์'),  -- 1
    ('อ.เมืองนครปฐม'),                          -- 2
    ('อ.นครชัยศรี'),                            -- 3
    ('อ.พุทธมณฑล'),                             -- 4
    ('อ.สามพราน'),                              -- 5
    ('อ.กำแพงแสน');                             -- 6

-- สมาชิก (hash ของ password123) -----------------------------------------
INSERT INTO members (email, password_hash, display_name, phone, role) VALUES
    ('admin@petfinder.test',  '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'แอดมิน',          NULL,          'admin'),   -- 1
    ('rescue@petfinder.test', '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'ชมรมรักษ์น้องจร', '0812345678', 'rescuer'), -- 2
    ('nida@example.com',      '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'นิดา',            '0898765432', 'member'),  -- 3
    ('ton@example.com',       '$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a', 'ต้น',             '0861112222', 'member');  -- 4

-- บทความ ----------------------------------------------------------------
INSERT INTO articles (author_id, title, body, published) VALUES
    (1, 'สัตว์หาย ทำอะไรก่อนดี 5 ข้อแรก', 'เริ่มจากค้นรอบบ้านในรัศมี 500 เมตร ...', true),
    (2, 'รับเลี้ยงแมวจรครั้งแรก ต้องเตรียมอะไรบ้าง', 'กระบะทราย อาหาร และพาไปตรวจสุขภาพ ...', true),
    (1, 'ร่าง: กิจกรรมทำหมันฟรีเดือนหน้า', 'รอยืนยันวันที่ ...', false);

-- ประกาศสัตว์หาย ----------------------------------------------------------
INSERT INTO lost_reports (owner_id, species_id, area_id, pet_name, sex, color, description, last_seen_at, status) VALUES
    (3, 2, 1, 'ส้มโอ', 'male',   'ส้ม',   'แมวส้มตัวใหญ่ ใส่ปลอกคอสีแดงมีกระดิ่ง', now() - interval '3 days',  'lost'),     -- 1
    (4, 1, 2, 'ข้าวตู',  'female', 'ขาว',   'หมาพันธุ์ผสม หูตก หางงอ',             now() - interval '10 days', 'reunited'), -- 2
    (3, 1, 3, 'ถั่วดำ',  'male',   'ดำ',    'หมาดำ ขาหน้าซ้ายมีแผลเป็น',            now() - interval '1 day',   'lost');     -- 3

-- แจ้งพบเห็นส้มโอ ----------------------------------------------------------
INSERT INTO sightings (lost_report_id, reporter_id, area_id, seen_at, note, lat, lng) VALUES
    (1, 4, 1, now() - interval '2 days', 'เห็นแมวส้มปลอกคอแดงแถวโรงอาหารกลาง', 13.818900, 100.040800),
    (1, 2, 1, now() - interval '1 day',  'น่าจะตัวเดียวกัน นอนอยู่หลังตึกคณะวิทย์', 13.820100, 100.042300);

-- ประกาศพบสัตว์หลง ---------------------------------------------------------
INSERT INTO found_reports (finder_id, species_id, area_id, sex, color, description, found_at, status, lost_report_id) VALUES
    (2, 1, 2, 'female',  'ขาว',   'หมาขาวหูตก หางงอ เดินหลงริมถนน',     now() - interval '8 days',  'returned',      2),    -- 1 คืนข้าวตูแล้ว
    (4, 2, 1, 'male',    'ส้ม',   'แมวส้มไม่มีปลอกคอ ผอม',               now() - interval '1 day',   'waiting_owner', NULL), -- 2 อาจเป็นส้มโอ?
    (2, 2, 4, 'female',  'สามสี', 'ลูกแมวสามสี อายุราว 3 เดือน',          now() - interval '20 days', 'for_adoption',  NULL); -- 3 ไม่มีเจ้าของมารับ

-- ประกาศหาบ้านใหม่ ---------------------------------------------------------
INSERT INTO adoption_listings (rescuer_id, found_report_id, species_id, area_id, pet_name, sex, age_months, sterilized, vaccinated, personality, status) VALUES
    (2, 3,    2, 4, 'มะลิ',   'female', 3,  false, true, 'ขี้อ้อน ชอบเล่นลูกบอล',              'open'),    -- 1 ย้ายมาจาก found_report 3
    (2, NULL, 1, 1, 'บราวนี่', 'male',   24, true,  true, 'ใจดี เข้ากับเด็กได้ เดินสายจูงเป็น', 'pending'), -- 2
    (2, NULL, 2, 2, 'ขนมปัง', 'male',   36, true,  true, 'ชอบนอน ไม่ซน',                      'adopted'); -- 3

-- คำขอรับเลี้ยง ------------------------------------------------------------
INSERT INTO adoption_requests (listing_id, applicant_id, housing_type, has_pets, has_experience, hours_alone, message, status, decided_at) VALUES
    (1, 4, 'condo', false, true,  8, 'อยู่คอนโดที่อนุญาตให้เลี้ยงแมว เคยเลี้ยงแมวที่บ้านต่างจังหวัด', 'pending',  NULL),
    (1, 3, 'house', true,  true,  4, 'มีแมวอยู่แล้วหนึ่งตัว อยากหาเพื่อนให้ บ้านมีสวนปิดมิดชิด',  'pending',  NULL),
    (2, 3, 'house', true,  true,  4, 'บ้านมีรั้วรอบ มีคนอยู่บ้านทั้งวัน พร้อมพาไปฉีดวัคซีนตามนัด', 'approved', now() - interval '1 day'),
    (2, 4, 'dorm',  false, false, 10, 'อยากเลี้ยงหมาตัวแรกในชีวิต จะศึกษาวิธีดูแลให้ดีที่สุด',      'rejected', now() - interval '1 day'),
    (3, 4, 'condo', false, true,  6, 'อยากรับขนมปังไปอยู่ด้วย คอนโดเลี้ยงแมวได้ มีเวลาเล่นด้วยทุกวัน', 'approved', now() - interval '40 days');

-- ติดตามผลหลังรับเลี้ยง ขนมปัง ---------------------------------------------
INSERT INTO adoption_updates (request_id, note, created_at) VALUES
    (5, 'ครบ 1 เดือน ขนมปังกินเก่ง นอนบนโซฟาทุกวัน', now() - interval '10 days');

COMMIT;
