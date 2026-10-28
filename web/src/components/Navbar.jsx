import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME, APP_TAGLINE } from '../config';
import Button, { ButtonLink } from './Button';
import Icon from './Icon';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-brand-500' : 'text-gray-600 hover:text-gray-900'
  }`;

// โลโก้: ไอคอนรถบนกล่องสีส้ม + ชื่อแอป + คำโปรย ใช้ทั้งแถบบน footer และหลังบ้าน
// dark = วางบนพื้นเข้ม (footer, sidebar)
export function Logo({ dark = false }) {
  return (
    <span className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
        <Icon name="bus" className="h-6 w-6" />
      </span>
      <span className="leading-tight">
        <span className={`block text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{APP_NAME}</span>
        <span className={`block text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{APP_TAGLINE}</span>
      </span>
    </span>
  );
}

// เมนูบัญชีมุมขวา: รูปประจำตัว + ชื่อ กดแล้วกางรายการลงมา คลิกนอกกล่องหรือกด Esc ก็ปิด
function AccountMenu({ member, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => (e.type === 'keydown' ? e.key === 'Escape' : !box.current?.contains(e.target)) && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50';
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-mint-50 text-mint-600">
          <Icon name="user" className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-gray-900">{member.displayName}</span>
        <Icon name="chevronDown" className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <Link role="menuitem" to="/bookings" className={item}>
            <Icon name="ticket" className="h-4 w-4" /> การจองของฉัน
          </Link>
          <Link role="menuitem" to="/me" className={item}>
            <Icon name="user" className="h-4 w-4" /> บัญชีของฉัน
          </Link>
          <button role="menuitem" type="button" onClick={onLogout} className={`${item} w-full text-brand-700`}>
            <Icon name="logOut" className="h-4 w-4" /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

// จอกว้าง (lg ขึ้นไป) ลิงก์อยู่กลางแถบ จอแคบซ่อนไว้หลังปุ่ม ☰ กดแล้วกางลงมาเป็นคอลัมน์
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

  const isStaff = member?.role === 'staff' || member?.role === 'admin';
  const links = (
    <>
      <NavLink to="/" end className={linkClass}>
        หน้าแรก
      </NavLink>
      <NavLink to="/trips" className={linkClass}>
        จองตั๋ว
      </NavLink>
      <NavLink to="/articles" className={linkClass}>
        บทความ
      </NavLink>
      {isStaff && (
        <NavLink to="/admin" className={linkClass}>
          หลังบ้าน
        </NavLink>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label={`${APP_NAME} หน้าแรก`}>
          <Logo />
        </Link>
        <div className="hidden items-center gap-2 lg:flex">{links}</div>
        <div className="hidden items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <>
              <ButtonLink to="/trips">
                <Icon name="plus" className="h-4 w-4" /> จองที่นั่ง
              </ButtonLink>
              <AccountMenu member={member} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="secondary">
                เข้าสู่ระบบ
              </ButtonLink>
              <ButtonLink to="/register">สมัครสมาชิก</ButtonLink>
            </>
          )}
        </div>
        <button
          className="rounded-xl p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'x' : 'menu'} className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 lg:hidden">
          {links}
          {isLoggedIn ? (
            <>
              <NavLink to="/bookings" className={linkClass}>
                การจองของฉัน
              </NavLink>
              <NavLink to="/me" className={linkClass}>
                {member?.displayName ?? 'บัญชีของฉัน'}
              </NavLink>
              <Button variant="ghost" onClick={handleLogout} className="justify-start">
                ออกจากระบบ
              </Button>
            </>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink to="/login" variant="secondary">
                เข้าสู่ระบบ
              </ButtonLink>
              <ButtonLink to="/register">สมัครสมาชิก</ButtonLink>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
export default Navbar;
