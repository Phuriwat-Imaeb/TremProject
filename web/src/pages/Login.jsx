import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Button from '../components/Button';
import Field from '../components/Field';
import usePageTitle from '../hooks/usePageTitle';

function Login() {
  usePageTitle('เข้าสู่ระบบ');
  const { login, isLoggedIn, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/'; // ProtectedRoute ฝากไว้ว่าตั้งใจจะไปหน้าไหน

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('typing'); // typing | submitting
  const [error, setError] = useState(null);

  if (isLoggedIn && status === 'typing') return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message); // ข้อความจาก server เช่น "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">เข้าสู่ระบบ</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ถูกพาออกจากระบบเพราะตั๋วหมดอายุ บอกเหตุผล (ถ้ามี error ใหม่ โชว์ error แทน) */}
        {notice && !error && <Alert type="info">{notice}</Alert>}
        <Field
          label="อีเมล"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="รหัสผ่าน"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={status === 'submitting'} className="w-full">
          {status === 'submitting' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        ยังไม่มีบัญชี?{' '}
        <Link to="/register" state={{ from }} className="text-teal-700 hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
export default Login;
