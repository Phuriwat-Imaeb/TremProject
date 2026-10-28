import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { fromThaiInput, toThaiInput, VEHICLE_LABEL } from '../../format';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const empty = { routeId: '', vehicleId: '', departAt: '', priceBaht: '' };

// หลังบ้าน: หน้าเดียวใช้ทั้งเพิ่มรอบ (/admin/trips/new) และแก้ไข (/admin/trips/:id/edit)
// แบบเดียวกับ ArticleForm: โหลดของที่ต้องใช้ให้ครบก่อน แล้วส่งค่าตั้งต้นให้ฟอร์ม
function TripForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  usePageTitle(isEdit ? 'แก้ไขรอบรถ' : 'เพิ่มรอบรถ');
  const { token } = useAuth();
  const trip = useApi(() => (isEdit ? api.getTrip(id) : null), [id]);
  const routes = useApi(() => api.listRoutes(), []);
  const vehicles = useApi(() => api.staffListVehicles(token), [token]);

  if (trip.loading || routes.loading || vehicles.loading) return <Loading />;
  const error = trip.error ?? routes.error ?? vehicles.error;
  if (error) return <Alert>{error.message}</Alert>;

  const t = trip.data;
  if (t && (t.status === 'cancelled' || t.departed)) return <Alert>รอบนี้ถูกยกเลิกหรือรถออกไปแล้ว แก้ไขไม่ได้</Alert>;

  const initial = t
    ? { routeId: String(t.route.id), vehicleId: String(t.vehicle.id), departAt: toThaiInput(t.departAt), priceBaht: String(t.priceBaht) }
    : empty;
  return (
    <Editor
      key={id ?? 'new'}
      id={id}
      initial={initial}
      routes={routes.data.items}
      vehicles={vehicles.data.items}
      token={token}
    />
  );
}

function Editor({ id, initial, routes, vehicles, token }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // ช่องกรอกเป็นสตริงทั้งหมด แปลงเป็นตัวเลข/เวลาไทยก่อนส่ง
    const body = { departAt: fromThaiInput(form.departAt), priceBaht: Number(form.priceBaht) };
    try {
      if (id) await api.updateTrip(id, body, token);
      else await api.createTrip({ ...body, routeId: Number(form.routeId), vehicleId: Number(form.vehicleId) }, token);
      toast.success(id ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรอบรถแล้ว');
      navigate('/admin/trips');
    } catch (err) {
      setError(err.message); // เช่น "รถคันนี้มีรอบออกเวลานี้อยู่แล้ว" จาก server
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">{id ? 'แก้ไขรอบรถ' : 'เพิ่มรอบรถ'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* แก้ไขเปลี่ยนเส้นทาง/คันรถไม่ได้ (คนจองไว้แล้วจะได้รถผิดคัน) ต้องยกเลิกรอบแล้วเพิ่มใหม่ */}
        <Field
          as="select"
          label="เส้นทาง"
          required
          disabled={Boolean(id)}
          value={form.routeId}
          onChange={set('routeId')}
        >
          <option value="">เลือกเส้นทาง</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.origin} → {r.destination}
            </option>
          ))}
        </Field>
        <Field
          as="select"
          label="คันรถ"
          required
          disabled={Boolean(id)}
          hint={id ? 'เปลี่ยนเส้นทางหรือคันรถไม่ได้ ถ้าจำเป็นให้ยกเลิกรอบนี้แล้วเพิ่มใหม่' : undefined}
          value={form.vehicleId}
          onChange={set('vehicleId')}
        >
          <option value="">เลือกคันรถ</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {VEHICLE_LABEL[v.kind]} {v.plate} ({v.seatCount} ที่)
            </option>
          ))}
        </Field>
        <Field
          type="datetime-local"
          label="เวลาออก (เวลาไทย)"
          required
          value={form.departAt}
          onChange={set('departAt')}
        />
        <Field
          type="number"
          label="ราคาต่อที่นั่ง (บาท)"
          required
          min={0}
          max={100000}
          step={1}
          hint={id ? 'เปลี่ยนราคาแล้ว คนที่จองไว้ก่อนยังจ่ายราคาเดิม' : undefined}
          value={form.priceBaht}
          onChange={set('priceBaht')}
        />
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/trips')}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
}
export default TripForm;
