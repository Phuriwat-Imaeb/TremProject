import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Field from '../components/Field';

const empty = { email: '', password: '', confirm: '', displayName: '', phone: '' };

// เช็กเบื้องต้นให้ตรงกับกฎฝั่ง Go (handler/auth.go) จะได้ไม่ต้องรอ server ตอบ 400
// ตัวจริงยังอยู่ที่ server เพราะใครจะยิง API ตรง ๆ ก็ได้
function validate(form) {
  if ([...form.password].length < 8) return 'รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป';
  if (form.password !== form.confirm) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
  const name = form.displayName.trim();
  if (!name || [...name].length > 50) return 'ชื่อที่แสดงต้องยาว 1-50 ตัวอักษร';
  return null;
}

function Register() {
  const { register, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';

  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('typing');
  const [error, setError] = useState(null);

  if (isLoggedIn && status === 'typing') return <Navigate to={from} replace />;

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setStatus('submitting');
    setError(null);
    try {
      const { confirm, ...body } = form;
      await register(body);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message); // เช่น "อีเมลนี้มีบัญชีอยู่แล้ว"
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="อีเมล" name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
        <Field
          label="ชื่อที่แสดง"
          name="displayName"
          autoComplete="nickname"
          required
          maxLength={50}
          value={form.displayName}
          onChange={update}
        />
        <Field
          label="เบอร์โทร (ไม่บังคับ)"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={update}
        />
        <Field
          label="รหัสผ่าน"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="อย่างน้อย 8 ตัวอักษร"
          value={form.password}
          onChange={update}
        />
        <Field
          label="ยืนยันรหัสผ่าน"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={update}
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
          {status === 'submitting' ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        มีบัญชีแล้ว?{' '}
        <Link to="/login" state={{ from }} className="text-teal-700 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
export default Register;
