import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Field from '../components/Field';

function Login() {
  const { login, isLoggedIn } = useAuth();
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
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-md bg-teal-600 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {status === 'submitting' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
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
