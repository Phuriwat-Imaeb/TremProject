import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';
import { ButtonLink } from './Button';
import Icon from './Icon';

// ครอบหน้าที่ต้อง login: ถ้ายังไม่ login ส่งไป /login แล้วจำไว้ว่ามาจากไหน
// roles={['admin']} = ต้องมีบทบาทนี้ด้วย ไม่ใช่ก็บอกว่าไม่มีสิทธิ์ (server ก็ตรวจซ้ำอีกชั้น ตอบ 403)
function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, member } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(member?.role)) {
    // ไม่พาไป /login เพราะ login อยู่แล้ว พาไปก็ไม่ช่วย บอกตรง ๆ ว่าไม่มีสิทธิ์แทน (หน้าตาตามการ์ดของแบบ B01)
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
              <Icon name="bus" className="h-6 w-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold">{APP_NAME}</span>
              <span className="block text-xs font-semibold text-brand-500">BACK OFFICE</span>
            </span>
          </div>
          <p className="mt-6 text-3xl font-bold">403</p>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fbe3e3] px-4 py-3 text-sm text-[#c43d3d]">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</span>
          </p>
          <p className="mt-3 text-sm text-gray-500">ถ้าเพิ่งได้รับสิทธิ์ ให้ออกจากระบบแล้วเข้าใหม่ เพราะตั๋วใบเดิมยังเป็นบทบาทเก่า</p>
          <ButtonLink to="/" className="mt-6 w-full">
            <Icon name="chevronLeft" className="h-4 w-4" /> กลับไปหน้าเว็บ
          </ButtonLink>
        </div>
      </div>
    );
  }
  return children;
}
export default ProtectedRoute;
