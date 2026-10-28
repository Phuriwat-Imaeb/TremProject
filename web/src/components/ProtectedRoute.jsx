import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from './Button';

// ครอบหน้าที่ต้อง login: ถ้ายังไม่ login ส่งไป /login แล้วจำไว้ว่ามาจากไหน
// roles={['admin']} = ต้องมีบทบาทนี้ด้วย ไม่ใช่ก็บอกว่าไม่มีสิทธิ์ (server ก็ตรวจซ้ำอีกชั้น ตอบ 403)
function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, member } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(member?.role)) {
    // ไม่พาไป /login เพราะ login อยู่แล้ว พาไปก็ไม่ช่วย บอกตรง ๆ ว่าไม่มีสิทธิ์แทน
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-teal-950 px-6 py-14 text-center text-white shadow-xl">
        <p className="text-6xl font-bold text-teal-300">403</p>
        <p className="mt-4 text-2xl font-bold">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
        <p className="mt-2 text-teal-50/90">
          ถ้าเพิ่งได้รับสิทธิ์ ให้ออกจากระบบแล้วเข้าใหม่ เพราะตั๋วใบเดิมยังเป็นบทบาทเก่า
        </p>
        <ButtonLink to="/" variant="secondary" className="mt-6 border-transparent text-teal-900">
          กลับหน้าแรก
        </ButtonLink>
      </div>
    );
  }
  return children;
}
export default ProtectedRoute;
