import { useAuth } from '../auth/AuthContext';
import Loading from '../components/Loading';
import usePageTitle from '../hooks/usePageTitle';

const roleLabel = { member: 'สมาชิก', rescuer: 'ผู้ช่วยเหลือสัตว์', admin: 'ผู้ดูแลระบบ' };

// อยู่ใต้ ProtectedRoute จึงมั่นใจว่า login แล้ว ข้อมูลมาจาก GET /api/me ที่ AuthProvider ถามไว้
function Profile() {
  usePageTitle('บัญชีของฉัน');
  const { member } = useAuth();
  if (!member) return <Loading />;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">บัญชีของฉัน</h1>
      <dl className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        <Row label="ชื่อที่แสดง" value={member.displayName} />
        <Row label="อีเมล" value={member.email} />
        <Row label="เบอร์โทร" value={member.phone || '-'} />
        <Row label="บทบาท" value={roleLabel[member.role] ?? member.role} />
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-all text-right font-medium">{value}</dd>
    </div>
  );
}
export default Profile;
