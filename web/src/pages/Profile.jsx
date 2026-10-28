import { useState } from 'react';
import { changePassword } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Button from '../components/Button';
import Field from '../components/Field';
import Loading from '../components/Loading';
import ProfileCard from '../components/ProfileCard';
import { ROLE_LABEL } from '../config';
import usePageTitle from '../hooks/usePageTitle';

// อยู่ใต้ ProtectedRoute จึงมั่นใจว่า login แล้ว ข้อมูลมาจาก GET /api/me ที่ AuthProvider ถามไว้
function Profile() {
  usePageTitle('บัญชีของฉัน');
  const { member } = useAuth();
  if (!member) return <Loading />;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <ProfileCard other={{ to: '/bookings', label: 'การจองของฉัน', icon: 'ticket' }} />
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">บัญชีของฉัน</h1>
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-bold">ข้อมูลบัญชี</h2>
          <dl className="divide-y divide-gray-200">
            <Row label="ชื่อที่แสดง" value={member.displayName} />
            <Row label="อีเมล" value={member.email} />
            <Row label="เบอร์โทร" value={member.phone || '-'} />
            <Row label="บทบาท" value={ROLE_LABEL[member.role] ?? member.role} />
          </dl>
        </section>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-3 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-all text-right font-medium">{value}</dd>
    </div>
  );
}

const empty = { currentPassword: '', newPassword: '', confirm: '' };

// เช็กเบื้องต้นให้ตรงกับกฎฝั่ง Go (ChangePassword ใน handler/auth.go) ตัวจริงยังอยู่ที่ server
function validate(form) {
  if ([...form.newPassword].length < 8) return 'รหัสผ่านใหม่ต้องยาว 8 ตัวอักษรขึ้นไป';
  if (form.newPassword !== form.confirm) return 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน';
  if (form.newPassword === form.currentPassword) return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
  return null;
}

function ChangePasswordForm() {
  const { token } = useAuth();
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('typing'); // typing | submitting | done
  const [error, setError] = useState(null);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === 'done') setStatus('typing');
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
      await changePassword(form.currentPassword, form.newPassword, token);
      setForm(empty); // ไม่ทิ้งรหัสค้างไว้ในช่อง
      setStatus('done');
    } catch (err) {
      setError(err.message); // เช่น "รหัสผ่านเดิมไม่ถูกต้อง"
      setStatus('typing');
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold">เปลี่ยนรหัสผ่าน</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="รหัสผ่านเดิม"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={form.currentPassword}
          onChange={update}
        />
        <Field
          label="รหัสผ่านใหม่"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint="อย่างน้อย 8 ตัวอักษร"
          value={form.newPassword}
          onChange={update}
        />
        <Field
          label="ยืนยันรหัสผ่านใหม่"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={update}
        />
        {error && <Alert>{error}</Alert>}
        {status === 'done' && <Alert type="success">เปลี่ยนรหัสผ่านแล้ว ครั้งหน้าให้เข้าสู่ระบบด้วยรหัสใหม่</Alert>}
        <Button type="submit" disabled={status === 'submitting'} className="w-full">
          {status === 'submitting' ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
        </Button>
      </form>
    </section>
  );
}

export default Profile;
