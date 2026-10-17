import { NavLink, Outlet } from 'react-router-dom';

const tabClass = ({ isActive }) =>
  `border-b-2 px-3 py-2 text-sm font-medium ${
    isActive ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`;

// กรอบของทุกหน้าหลังบ้าน: แถบเมนูด้านบน แล้วหน้าย่อยแสดงตรง <Outlet />
// (ด่าน admin อยู่ที่ Route ใน App.js ครอบไว้ทั้งกลุ่ม)
function AdminLayout() {
  return (
    <div>
      <nav aria-label="เมนูหลังบ้าน" className="mb-6 flex gap-2 border-b border-gray-200">
        <NavLink to="/admin/articles" className={tabClass}>
          บทความ
        </NavLink>
        <NavLink to="/admin/members" className={tabClass}>
          สมาชิก
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
export default AdminLayout;
