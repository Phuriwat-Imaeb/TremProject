import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from '../config';
import Badge from './Badge';
import { ButtonLink } from './Button';
import Icon from './Icon';

const ROLE_TONE = { member: 'info', staff: 'success', admin: 'danger' };

// การ์ดโปรไฟล์ด้านซ้ายของหน้า "บัญชีของฉัน" และ "การจองของฉัน" (แบบ F10)
// other = ลิงก์ไปอีกหน้าหนึ่งในสองหน้านี้ { to, label, icon }
function ProfileCard({ other }) {
  const { member, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
      <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-mint-50 text-mint-600">
        <Icon name="user" className="h-11 w-11" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-2xl font-bold">{member.displayName}</p>
      <div className="mt-2">
        <Badge tone={ROLE_TONE[member.role] ?? 'neutral'}>{`${ROLE_LABEL[member.role] ?? member.role} (${member.role})`}</Badge>
      </div>
      <ul className="mt-6 space-y-3 text-left text-sm text-gray-700">
        <li className="flex items-center gap-3 break-all">
          <Icon name="fileText" className="h-4 w-4 shrink-0 text-gray-500" /> {member.email}
        </li>
        <li className="flex items-center gap-3">
          <Icon name="phone" className="h-4 w-4 shrink-0 text-gray-500" /> {member.phone || 'ยังไม่ได้ใส่เบอร์โทร'}
        </li>
      </ul>
      <ButtonLink to={other.to} variant="secondary" className="mt-6 w-full">
        <Icon name={other.icon} className="h-4 w-4" /> {other.label}
      </ButtonLink>
      <button type="button" onClick={handleLogout} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
        <Icon name="logOut" className="h-4 w-4" /> ออกจากระบบ
      </button>
    </aside>
  );
}
export default ProfileCard;
