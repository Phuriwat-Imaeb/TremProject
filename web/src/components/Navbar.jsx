import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';

const linkBase = 'rounded-full px-3 py-2 text-sm font-medium transition-colors';
const linkClass = ({ isActive }) =>
  `${linkBase} ${isActive ? 'bg-teal-50 text-teal-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;

// จอกว้าง (md ขึ้นไป) ลิงก์เรียงเป็นแถว จอแคบซ่อนไว้หลังปุ่ม ☰ กดแล้วกางลงมาเป็นคอลัมน์
function Navbar() {
  const { isLoggedIn, member, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // เปลี่ยนหน้าแล้วหุบเมนูมือถือ
  useEffect(() => setOpen(false), [pathname]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  // ลิงก์ชุดเดียวใช้ทั้งสองขนาดจอ ต่างกันแค่การจัดวาง
  const links = (
    <>
      <NavLink to="/trips" className={linkClass}>
        จองตั๋ว
      </NavLink>
      <NavLink to="/articles" className={linkClass}>
        บทความ
      </NavLink>
      {(member?.role === 'staff' || member?.role === 'admin') && (
        <NavLink to="/admin" className={linkClass}>
          หลังบ้าน
        </NavLink>
      )}
      {isLoggedIn ? (
        <>
          <NavLink to="/bookings" className={linkClass}>
            การจองของฉัน
          </NavLink>
          <NavLink to="/me" className={linkClass}>
            {member?.displayName ?? 'บัญชีของฉัน'}
          </NavLink>
          <button onClick={handleLogout} className={`${linkBase} text-left text-gray-600 hover:bg-red-50 hover:text-red-700`}>
            ออกจากระบบ
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={linkClass}>
            เข้าสู่ระบบ
          </NavLink>
          <NavLink to="/register" className={`${linkBase} bg-teal-600 text-center text-white hover:bg-teal-700`}>
            สมัครสมาชิก
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-xs font-bold text-white">
            JK
          </span>
          {APP_NAME}
        </Link>
        <div className="hidden items-center gap-1 md:flex">{links}</div>
        <button
          className="rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {open ? '✕' : '☰'}
          </span>
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="flex flex-col gap-1 border-t border-gray-200 px-4 py-2 md:hidden">
          {links}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
