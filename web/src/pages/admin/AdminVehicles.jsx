import { useState } from 'react';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Field from '../../components/Field';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { VEHICLE_LABEL } from '../../format';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const empty = { plate: '', kind: 'van', seatCount: '' };

// ฟอร์มเพิ่ม/แก้คันรถ แบบเดียวกับ RouteForm
function VehicleForm({ editing, token, onSaved, onCancel }) {
  const [form, setForm] = useState(
    editing ? { plate: editing.plate, kind: editing.kind, seatCount: String(editing.seatCount) } : empty
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = { ...form, seatCount: Number(form.seatCount) };
    try {
      onSaved(editing ? await api.updateVehicle(editing.id, body, token) : await api.createVehicle(body, token));
    } catch (err) {
      setError(err.message); // เช่น "มีคนจองที่นั่งเลข 12 ในรอบที่ยังไม่ออก ลดจำนวนที่นั่งไม่ได้"
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">{editing ? `แก้คันรถ #${editing.id}` : 'เพิ่มคันรถ'}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem]">
        <Field label="ทะเบียนรถ" required maxLength={20} value={form.plate} onChange={set('plate')} />
        <Field as="select" label="ประเภท" value={form.kind} onChange={set('kind')}>
          <option value="van">{VEHICLE_LABEL.van}</option>
          <option value="bus">{VEHICLE_LABEL.bus}</option>
        </Field>
        <Field
          label="จำนวนที่นั่ง"
          type="number"
          required
          min={1}
          max={60}
          value={form.seatCount}
          onChange={set('seatCount')}
        />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
        {editing && (
          <Button variant="secondary" onClick={onCancel}>
            ยกเลิกการแก้ไข
          </Button>
        )}
      </div>
    </form>
  );
}

// หลังบ้าน (admin): คันรถทั้งหมด เพิ่ม แก้ ลบ ลบได้เฉพาะคันที่ยังไม่มีรอบรถ
function AdminVehicles() {
  usePageTitle('จัดการคันรถ');
  const { token } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useApi(() => api.staffListVehicles(token), [token]);
  const [editing, setEditing] = useState(null);
  // เพิ่มทีละเลขทุกครั้งที่บันทึกสำเร็จ: key ของฟอร์มเปลี่ยน ฟอร์มจึงเริ่มใหม่ (ช่องว่าง ปุ่มกดได้) แม้จะอยู่โหมดเพิ่มเหมือนเดิม
  const [formRound, setFormRound] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function saved(vehicle) {
    setData((d) => ({
      items: editing ? d.items.map((v) => (v.id === vehicle.id ? vehicle : v)) : [...d.items, vehicle],
    }));
    toast.success(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มคันรถแล้ว');
    setEditing(null);
    setFormRound((n) => n + 1);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteVehicle(toDelete.id, token);
      setData((d) => ({ items: d.items.filter((v) => v.id !== toDelete.id) }));
      toast.success('ลบคันรถแล้ว');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div>
      <PageHeader title="จัดการคันรถ" />
      <VehicleForm
        key={editing ? `edit-${editing.id}` : `new-${formRound}`}
        editing={editing}
        token={token}
        onSaved={saved}
        onCancel={() => setEditing(null)}
      />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && <EmptyState message="ยังไม่มีคันรถ" />}
      {data?.items.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {data.items.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{v.plate}</p>
                <p className="text-xs text-gray-500">
                  {VEHICLE_LABEL[v.kind]} · {v.seatCount} ที่นั่ง
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setEditing(v)}>
                  แก้ไข
                </Button>
                <Button variant="ghostDanger" onClick={() => setToDelete(v)}>
                  ลบ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="ลบคันรถนี้?"
        message={toDelete && `${toDelete.plate} (ลบได้เฉพาะคันที่ยังไม่เคยมีรอบรถ)`}
        confirmLabel="ลบ"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
export default AdminVehicles;
