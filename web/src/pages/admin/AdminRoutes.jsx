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
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const empty = { origin: '', destination: '', durationMin: '' };

// ฟอร์มเพิ่ม/แก้เส้นทาง อยู่บนหน้าเดียวกับรายการ (ข้อมูลน้อย ไม่ต้องแยกหน้า)
// editing = เส้นทางที่กำลังแก้ null = เพิ่มใหม่ คนเรียกใส่ key ให้ฟอร์มเริ่มใหม่เมื่อเปลี่ยนรายการที่แก้
function RouteForm({ editing, token, onSaved, onCancel }) {
  const [form, setForm] = useState(
    editing ? { origin: editing.origin, destination: editing.destination, durationMin: String(editing.durationMin) } : empty
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = { ...form, durationMin: Number(form.durationMin) };
    try {
      onSaved(editing ? await api.updateRoute(editing.id, body, token) : await api.createRoute(body, token));
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">{editing ? `แก้เส้นทาง #${editing.id}` : 'เพิ่มเส้นทาง'}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
        <Field label="ต้นทาง" required maxLength={100} value={form.origin} onChange={set('origin')} />
        <Field label="ปลายทาง" required maxLength={100} value={form.destination} onChange={set('destination')} />
        <Field
          label="เวลาเดินทาง (นาที)"
          type="number"
          required
          min={1}
          max={2880}
          value={form.durationMin}
          onChange={set('durationMin')}
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

// หลังบ้าน (admin): เส้นทางทั้งหมด เพิ่ม แก้ ลบ ลบได้เฉพาะเส้นทางที่ยังไม่มีรอบรถ
function AdminRoutes() {
  usePageTitle('จัดการเส้นทาง');
  const { token } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useApi(() => api.listRoutes(), []);
  const [editing, setEditing] = useState(null);
  // เพิ่มทีละเลขทุกครั้งที่บันทึกสำเร็จ: key ของฟอร์มเปลี่ยน ฟอร์มจึงเริ่มใหม่ (ช่องว่าง ปุ่มกดได้) แม้จะอยู่โหมดเพิ่มเหมือนเดิม
  const [formRound, setFormRound] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function saved(route) {
    // แก้ = แทนแถวเดิม, เพิ่ม = ต่อท้าย (รายการเรียงตาม id อยู่แล้ว)
    setData((d) => ({
      items: editing ? d.items.map((r) => (r.id === route.id ? route : r)) : [...d.items, route],
    }));
    toast.success(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มเส้นทางแล้ว');
    setEditing(null);
    setFormRound((n) => n + 1);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteRoute(toDelete.id, token);
      setData((d) => ({ items: d.items.filter((r) => r.id !== toDelete.id) }));
      toast.success('ลบเส้นทางแล้ว');
    } catch (err) {
      toast.error(err.message); // เช่น "มีรอบรถใช้รายการนี้อยู่ ลบไม่ได้"
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div>
      <PageHeader title="จัดการเส้นทาง" />
      <RouteForm
        key={editing ? `edit-${editing.id}` : `new-${formRound}`}
        editing={editing}
        token={token}
        onSaved={saved}
        onCancel={() => setEditing(null)}
      />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && <EmptyState message="ยังไม่มีเส้นทาง" />}
      {data?.items.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {data.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.origin} → {r.destination}
                </p>
                <p className="text-xs text-gray-500">ประมาณ {r.durationMin} นาที</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setEditing(r)}>
                  แก้ไข
                </Button>
                <Button variant="ghostDanger" onClick={() => setToDelete(r)}>
                  ลบ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="ลบเส้นทางนี้?"
        message={toDelete && `${toDelete.origin} → ${toDelete.destination} (ลบได้เฉพาะเส้นทางที่ยังไม่เคยมีรอบรถ)`}
        confirmLabel="ลบ"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
export default AdminRoutes;
