import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import { Logo } from './Navbar';

const col = 'space-y-3 text-sm';
const head = 'text-sm font-semibold text-white';
const link = 'block text-gray-400 hover:text-white';

// ท้ายเว็บพื้นน้ำตาลเข้ม ตาม Footer ใน Design System
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto_auto] md:gap-16">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-6">จองที่นั่งรถตู้และรถทัวร์ เลือกที่นั่งเองจากผังรถ เห็นที่ว่างแบบเรียลไทม์</p>
          </div>
          <div className={col}>
            <p className={head}>เมนู</p>
            <Link to="/trips" className={link}>
              จองตั๋ว
            </Link>
            <Link to="/articles" className={link}>
              บทความ
            </Link>
          </div>
          <div className={col}>
            <p className={head}>สมาชิก</p>
            <Link to="/register" className={link}>
              สมัครสมาชิก
            </Link>
            <Link to="/login" className={link}>
              เข้าสู่ระบบ
            </Link>
            <Link to="/bookings" className={link}>
              การจองของฉัน
            </Link>
          </div>
          <div className={col}>
            <p className={head}>ติดต่อ</p>
            <p>หมอชิต · สายใต้ · นครปฐม</p>
            <p>เปิดจองทุกวัน 24 ชั่วโมง</p>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs">
          © 2569 {APP_NAME} · โปรเจกต์รายวิชา 520342 Server Side Web Programming
        </p>
      </div>
    </footer>
  );
}
export default Footer;
