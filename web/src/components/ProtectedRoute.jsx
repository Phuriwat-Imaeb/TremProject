import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// ครอบหน้าที่ต้อง login: ถ้ายังไม่ login ส่งไป /login แล้วจำไว้ว่ามาจากไหน
// roles={['admin']} = ต้องมีบทบาทนี้ด้วย ไม่ใช่ก็บอกว่าไม่มีสิทธิ์ (server ก็ตรวจซ้ำอีกชั้น ตอบ 403)
function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, member } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(member?.role)) {
    return <p className="text-center text-gray-600">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>;
  }
  return children;
}
export default ProtectedRoute;
