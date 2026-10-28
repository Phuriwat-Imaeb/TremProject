import { useState } from 'react';
import Button from './Button';
import Field from './Field';

// ฟอร์มเลือกเส้นทาง + วันที่ ใช้ทั้งหน้าค้นหารอบ (หน้าบ้าน) และหน้าจัดการรอบ (หลังบ้าน)
// ค่าในช่องเป็น state ของฟอร์มเอง กด "ค้นหา" ถึงส่ง { routeId, date } ให้คนเรียก (ปกติเขียนลง URL)
// คนเรียกควรใส่ key ที่เปลี่ยนตาม URL กด back แล้วฟอร์มจะเปลี่ยนตาม
// minDate: หน้าบ้านห้ามเลือกวันที่ผ่านมาแล้ว หลังบ้านไม่ใส่ จะได้ย้อนดูรอบเก่าได้
function TripFilterForm({ routes, routeId, date, minDate, onSearch }) {
  const [form, setForm] = useState({ routeId, date });
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    onSearch(form);
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-card sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-6"
    >
      <Field as="select" label="เส้นทาง" value={form.routeId} onChange={set('routeId')}>
        <option value="">ทุกเส้นทาง</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.origin} → {r.destination}
          </option>
        ))}
      </Field>
      <Field type="date" label="วันเดินทาง" min={minDate} value={form.date} onChange={set('date')} />
      <Button type="submit">ค้นหา</Button>
    </form>
  );
}
export default TripFilterForm;
