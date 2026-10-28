import { useState } from 'react';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Chip from '../../components/Chip';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/Icon';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { ROLE_LABEL } from '../../config';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const ROLE_TONE = { member: 'neutral', staff: 'info', admin: 'danger' };
const AVATAR = { member: 'bg-mint-50 text-mint-600', staff: 'bg-[#e3edfc] text-[#2f66c4]', admin: 'bg-[#fbe3e3] text-[#c43d3d]' };

// หลังบ้าน: รายชื่อสมาชิก เปลี่ยนบทบาทได้ (ยกเว้นของตัวเอง server ก็กันไว้อีกชั้น ตอบ 409)
function AdminMembers() {
  usePageTitle('จัดการสมาชิก');
  const { token, member: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useApi(() => api.adminListMembers(token), [token]);

  // เลือกบทบาทใหม่ในดรอปดาวน์แล้ว ยังไม่เปลี่ยนจริง ถามยืนยันก่อน: { member, role }
  const [change, setChange] = useState(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('all'); // ปุ่มกรองตามบทบาท
  const [query, setQuery] = useState('');

  async function confirmChange() {
    setSaving(true);
    try {
      const updated = await api.setMemberRole(change.member.id, change.role, token);
      setData((d) => ({ ...d, items: d.items.map((m) => (m.id === updated.id ? updated : m)) }));
      toast.success(`${updated.displayName} เป็น${ROLE_LABEL[updated.role]}แล้ว (มีผลเมื่อเข้าสู่ระบบครั้งถัดไป)`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
      setChange(null);
    }
  }

  if (loading) return <Loading />;
  if (error) return <Alert>{error.message}</Alert>;

  // กรองในเครื่อง (รายชื่อทั้งหมดมากับคำขอเดียวอยู่แล้ว)
  const words = query.trim().toLowerCase();
  const shown = data.items.filter(
    (m) =>
      (role === 'all' || m.role === role) &&
      (!words || m.displayName.toLowerCase().includes(words) || m.email.toLowerCase().includes(words))
  );
  const count = (r) => data.items.filter((m) => r === 'all' || m.role === r).length;

  return (
    <div>
      <PageHeader title="จัดการสมาชิก" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', ...Object.keys(ROLE_LABEL)].map((r) => (
            <Chip key={r} selected={role === r} onClick={() => setRole(r)}>
              {r === 'all' ? 'ทั้งหมด' : r} ({count(r)})
            </Chip>
          ))}
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">ค้นหาชื่อหรืออีเมล</span>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล"
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-100 text-left text-xs text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">สมาชิก</th>
              <th className="px-5 py-3 font-medium">เบอร์โทร</th>
              <th className="px-5 py-3 font-medium">บทบาท</th>
              <th className="px-5 py-3 font-medium">เปลี่ยนบทบาท</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shown.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR[m.role] ?? AVATAR.member}`}>
                      {m.displayName[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {m.displayName}
                        {m.id === me?.id && <span className="ml-1 text-xs text-gray-500">(คุณ)</span>}
                      </p>
                      <p className="truncate text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{m.phone || '–'}</td>
                <td className="px-5 py-3">
                  <Badge tone={ROLE_TONE[m.role] ?? 'neutral'}>{m.role}</Badge>
                </td>
                <td className="px-5 py-3">
                  <select
                    aria-label={`บทบาทของ ${m.displayName}`}
                    value={m.role}
                    disabled={m.id === me?.id}
                    onChange={(e) => setChange({ member: m, role: e.target.value })}
                    className="min-h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {Object.entries(ROLE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-5 py-10 text-center text-gray-500">ไม่พบสมาชิกที่ตรงกับที่เลือก</p>}
        <p className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
          แสดง {shown.length} จาก {data.items.length} คน
        </p>
      </div>
      <ConfirmDialog
        open={change !== null}
        title="เปลี่ยนบทบาท?"
        message={
          change &&
          `${change.member.displayName}: ${ROLE_LABEL[change.member.role]} → ${ROLE_LABEL[change.role]} ` +
            `(สมาชิกต้องเข้าสู่ระบบใหม่ถึงจะได้สิทธิ์ใหม่)`
        }
        confirmLabel="เปลี่ยน"
        busy={saving}
        onConfirm={confirmChange}
        onCancel={() => setChange(null)}
      />
    </div>
  );
}
export default AdminMembers;
