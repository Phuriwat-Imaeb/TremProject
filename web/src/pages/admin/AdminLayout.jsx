import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABEL } from '../../config';

const tabClass = ({ isActive }) =>
  `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white text-teal-900' : 'text-teal-50 hover:bg-white/10'
  }`;

// กรอบของทุกหน้าหลังบ้าน: แถบเมนูด้านบน แล้วหน้าย่อยแสดงตรง <Outlet />
// (ด่านอยู่ที่ Route ใน App.js) staff เห็นแค่แท็บรอบรถ admin เห็นทุกแท็บ
function AdminLayout() {
  const { member } = useAuth();
  const isAdmin = member?.role === 'admin';
  return (
    <div>
      {/* หัวหลังบ้านพื้นเขียวเข้มชุดเดียวกับหน้าแรก ชื่อหน้าจริง (h1) อยู่ในหน้าย่อยแต่ละหน้า */}
      <div className="mb-8 rounded-3xl bg-teal-950 px-6 py-6 text-white shadow-xl sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Back office</p>
        <p className="mt-1 text-2xl font-bold">หลังบ้าน · {ROLE_LABEL[member?.role] ?? member?.role}</p>
        {/* แท็บเยอะกว่าจอมือถือ เลื่อนแนวนอนได้เฉพาะแถบนี้ หน้าเว็บทั้งหน้าไม่เลื่อน */}
        <nav aria-label="เมนูหลังบ้าน" className="-mx-1 mt-5 flex gap-1 overflow-x-auto whitespace-nowrap px-1">
          <NavLink to="/admin/trips" className={tabClass}>
            รอบรถ
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/routes" className={tabClass}>
                เส้นทาง
              </NavLink>
              <NavLink to="/admin/vehicles" className={tabClass}>
                คันรถ
              </NavLink>
              <NavLink to="/admin/articles" className={tabClass}>
                บทความ
              </NavLink>
              <NavLink to="/admin/members" className={tabClass}>
                สมาชิก
              </NavLink>
            </>
          )}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
export default AdminLayout;
