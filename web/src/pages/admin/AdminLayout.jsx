import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const tabClass = ({ isActive }) =>
  `border-b-2 px-3 py-2 text-sm font-medium ${
    isActive ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`;

// กรอบของทุกหน้าหลังบ้าน: แถบเมนูด้านบน แล้วหน้าย่อยแสดงตรง <Outlet />
// (ด่านอยู่ที่ Route ใน App.js) staff เห็นแค่แท็บรอบรถ admin เห็นทุกแท็บ
function AdminLayout() {
  const { member } = useAuth();
  const isAdmin = member?.role === 'admin';
  return (
    <div>
      {/* แท็บเยอะกว่าจอมือถือ เลื่อนแนวนอนได้เฉพาะแถบนี้ หน้าเว็บทั้งหน้าไม่เลื่อน */}
      <nav aria-label="เมนูหลังบ้าน" className="mb-6 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-gray-200">
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
      <Outlet />
    </div>
  );
}
export default AdminLayout;
