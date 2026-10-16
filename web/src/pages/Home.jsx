import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Home() {
  const { isLoggedIn, member } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">PetFinder</h1>
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
