import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';

const linkBase = 'rounded-xl px-3 py-2 text-sm font-semibold transition';
const linkClass = ({ isActive }) =>
  `${linkBase} ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-800'}`;

function MenuIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
          <button onClick={handleLogout} className={`${linkBase} text-left text-slate-600 hover:bg-slate-50 hover:text-brand-800`}>
            ออกจากระบบ
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={linkClass}>
            เข้าสู่ระบบ
          </NavLink>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? 'bg-brand-700 text-white' : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'}`
            }
          >
            สมัครสมาชิก
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-brand-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-extrabold text-white shadow-sm">
            JK
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">{links}</div>
        <button
          className="rounded-xl p-2 text-slate-700 transition hover:bg-brand-50 hover:text-brand-800 md:hidden"
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <MenuIcon open={open} />
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="flex flex-col gap-1 border-t border-slate-100 bg-white px-4 py-3 shadow-soft md:hidden">
          {links}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
