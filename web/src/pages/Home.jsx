import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME } from '../config';
import usePageTitle from '../hooks/usePageTitle';

function Home() {
  usePageTitle(); // หน้าแรก ชื่อแท็บเป็นชื่อแอปอย่างเดียว
  const { isLoggedIn, member } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{APP_NAME}</h1>
      <p>
        จองที่นั่งรถตู้และรถทัวร์ เลือกที่นั่งได้เองจากผังรถ{' '}
        <Link to="/trips" className="font-medium text-teal-700 hover:underline">
          ค้นหารอบรถ →
        </Link>
      </p>
      {isLoggedIn ? (
        <p>
          สวัสดี {member?.displayName}{' '}
          <Link to="/me" className="text-teal-700 hover:underline">
            ดูข้อมูลบัญชี
          </Link>
        </p>
      ) : (
        <p>
          <Link to="/login" className="text-teal-700 hover:underline">
            เข้าสู่ระบบ
          </Link>{' '}
          หรือ{' '}
          <Link to="/register" className="text-teal-700 hover:underline">
            สมัครสมาชิก
          </Link>{' '}
          เพื่อเริ่มใช้งาน
        </p>
      )}
    </div>
  );
}
export default Home;
