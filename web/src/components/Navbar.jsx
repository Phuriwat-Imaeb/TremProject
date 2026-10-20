import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';

const linkBase = 'rounded-md px-3 py-2 text-sm font-medium';
const linkClass = ({ isActive }) =>
  `${linkBase} ${isActive ? 'bg-teal-700 text-white' : 'text-teal-50 hover:bg-teal-500'}`;

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
          <button onClick={handleLogout} className={`${linkBase} text-left text-teal-50 hover:bg-teal-500`}>
            ออกจากระบบ
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={linkClass}>
            เข้าสู่ระบบ
          </NavLink>
          <NavLink to="/register" className={linkClass}>
            สมัครสมาชิก
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <nav className="bg-teal-600">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-white">
          {APP_NAME}
        </Link>
        <div className="hidden items-center gap-1 md:flex">{links}</div>
        <button
          className="rounded-md p-2 text-white hover:bg-teal-500 md:hidden"
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
        <div id="mobile-menu" className="flex flex-col gap-1 border-t border-teal-500 px-4 py-2 md:hidden">
          {links}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
