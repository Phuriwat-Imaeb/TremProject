import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ButtonLink } from '../../components/Button';
import Icon from '../../components/Icon';
import { Logo } from '../../components/Navbar';
import { ROLE_LABEL } from '../../config';

// เมนูหลังบ้าน adminOnly = เห็นเฉพาะ admin (server ก็ตรวจซ้ำ ตอบ 403)
const MENU = [
  { to: '/admin', label: 'แดชบอร์ด', icon: 'dashboard', end: true },
  { to: '/admin/trips', label: 'รอบรถ', icon: 'bus' },
  { to: '/admin/routes', label: 'เส้นทาง', icon: 'route', adminOnly: true },
  { to: '/admin/vehicles', label: 'คันรถ', icon: 'list', adminOnly: true },
  { to: '/admin/articles', label: 'บทความ', icon: 'fileText', adminOnly: true },
  { to: '/admin/members', label: 'สมาชิก', icon: 'users', adminOnly: true },
];

const itemClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-500 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
  }`;

// กรอบของทุกหน้าหลังบ้าน (แบบ B02, B03): sidebar ซ้ายพื้นเข้ม แถบบนบอกตำแหน่ง แล้วหน้าย่อยแสดงตรง <Outlet />
// จอแคบ sidebar กลายเป็นแถบบน เมนูเลื่อนแนวนอนได้เฉพาะแถบนี้ หน้าเว็บทั้งหน้าไม่เลื่อน
function AdminLayout() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = member?.role === 'admin';
  const menu = MENU.filter((m) => isAdmin || !m.adminOnly);
  // ชื่อส่วนที่เปิดอยู่ = เมนูที่ path ยาวที่สุดที่ขึ้นต้นตรงกัน
  const current = [...MENU].reverse().find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`)) ?? MENU[0];

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[264px_1fr]">
      {/* พื้นเข้มยืดเต็มความสูงของหน้า ส่วนเมนูข้างในติดอยู่กับจอตอนเลื่อน */}
      <div className="bg-gray-900">
        <aside className="flex flex-col gap-6 px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link to="/admin" aria-label="หลังบ้าน หน้าแดชบอร์ด">
              <Logo dark />
            </Link>
            <p className="hidden rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-brand-400 sm:inline-block lg:mt-4">
              BACK OFFICE · {ROLE_LABEL[member?.role] ?? member?.role}
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-2 hidden px-1 text-xs text-gray-400 lg:block">เมนูหลัก</p>
            <nav aria-label="เมนูหลังบ้าน" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
              {menu.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} className={itemClass}>
                  <Icon name={m.icon} />
                  {m.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mt-auto hidden space-y-3 lg:block">
            <div className="flex items-center gap-3 rounded-2xl bg-gray-800 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 font-bold text-white">
                {member?.displayName?.[0]}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block truncate font-semibold text-white">{member?.displayName}</span>
                <span className="block truncate text-xs text-gray-400">{member?.email}</span>
              </span>
            </div>
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
              <Icon name="logOut" /> ออกจากระบบ
            </button>
          </div>
        </aside>
      </div>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-8">
          <p className="text-sm text-gray-500">
            Back office / <span className="font-semibold text-gray-900">{current.label}</span>
          </p>
          <div className="flex gap-2">
            <ButtonLink to="/" variant="secondary" size="sm">
              ดูหน้าเว็บ
            </ButtonLink>
            <button type="button" onClick={handleLogout} className="rounded-lg px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 lg:hidden">
              ออกจากระบบ
            </button>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
