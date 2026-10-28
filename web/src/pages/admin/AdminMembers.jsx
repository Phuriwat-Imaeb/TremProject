import { useState } from 'react';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import ConfirmDialog from '../../components/ConfirmDialog';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { ROLE_LABEL } from '../../config';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

// หลังบ้าน: รายชื่อสมาชิก เปลี่ยนบทบาทได้ (ยกเว้นของตัวเอง server ก็กันไว้อีกชั้น ตอบ 409)
function AdminMembers() {
  usePageTitle('จัดการสมาชิก');
  const { token, member: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useApi(() => api.adminListMembers(token), [token]);

  // เลือกบทบาทใหม่ในดรอปดาวน์แล้ว ยังไม่เปลี่ยนจริง ถามยืนยันก่อน: { member, role }
  const [change, setChange] = useState(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <PageHeader title="จัดการสมาชิก" />
      <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {data.items.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {m.displayName}
                {m.id === me?.id && <span className="ml-1 text-xs text-gray-500">(คุณ)</span>}
              </p>
              <p className="truncate text-xs text-gray-500">
                {m.email}
                {m.phone && ` · ${m.phone}`}
              </p>
            </div>
            <select
              aria-label={`บทบาทของ ${m.displayName}`}
              value={m.role}
              disabled={m.id === me?.id}
              onChange={(e) => setChange({ member: m, role: e.target.value })}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
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
