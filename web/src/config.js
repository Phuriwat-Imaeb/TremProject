// ค่าที่ผูกกับหัวข้อโปรเจกต์ เปลี่ยนหัวข้อแล้วแก้ที่นี่ที่เดียว

// ชื่อแอปที่โชว์บนหน้าเว็บทั้งหมด (Navbar, หน้าแรก, ชื่อแท็บ)
// ยกเว้นสองไฟล์ static ที่ JavaScript แก้ให้ไม่ได้: public/index.html (<title>) กับ public/manifest.json
export const APP_NAME = 'Jong(kook)hub';
// คำโปรยใต้ชื่อแอปในโลโก้
export const APP_TAGLINE = 'จองที่นั่งรถตู้ · รถทัวร์';

// บทบาทสมาชิก ต้องตรงกับ CHECK ของตาราง members ใน db/schema.sql
export const ROLE_LABEL = { member: 'สมาชิก', staff: 'พนักงาน', admin: 'ผู้ดูแลระบบ' };
