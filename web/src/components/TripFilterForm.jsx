import { useState } from 'react';
import Button from './Button';
import Field from './Field';
import Icon from './Icon';

// ฟอร์มเลือกเส้นทาง + วันที่ ใช้ทั้งหน้าค้นหารอบ (หน้าบ้าน) และหน้าจัดการรอบ (หลังบ้าน)
// ค่าในช่องเป็น state ของฟอร์มเอง กด "ค้นหา" ถึงส่ง { routeId, date } ให้คนเรียก (ปกติเขียนลง URL)
// คนเรียกควรใส่ key ที่เปลี่ยนตาม URL กด back แล้วฟอร์มจะเปลี่ยนตาม
// minDate: หน้าบ้านห้ามเลือกวันที่ผ่านมาแล้ว หลังบ้านไม่ใส่ จะได้ย้อนดูรอบเก่าได้
// stacked: เรียงช่องลงมาเป็นกล่อง "ตัวกรอง" ด้านข้าง (หน้าค้นหา) ไม่ใส่ = เรียงเป็นแถวเดียว
function TripFilterForm({ routes, routeId, date, minDate, onSearch, stacked = false }) {
  const [form, setForm] = useState({ routeId, date });
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    onSearch(form);
  }

  function clear() {
    setForm({ routeId: '', date: '' });
    onSearch({ routeId: '', date: '' });
  }

  const fields = (
    <>
      <Field as="select" label="เส้นทาง" value={form.routeId} onChange={set('routeId')}>
        <option value="">ทุกเส้นทาง</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.origin} → {r.destination}
          </option>
        ))}
      </Field>
      <Field type="date" label="วันเดินทาง" min={minDate} value={form.date} onChange={set('date')} />
    </>
  );

  if (stacked) {
    return (
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">ตัวกรอง</h2>
          <button type="button" onClick={clear} className="text-xs font-medium text-brand-700 hover:underline">
            ล้างทั้งหมด
          </button>
        </div>
        {fields}
        <Button type="submit" className="w-full">
          <Icon name="search" className="h-4 w-4" /> ค้นหา
        </Button>
      </form>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end"
    >
      {fields}
      <Button type="submit">
        <Icon name="search" className="h-4 w-4" /> ค้นหา
      </Button>
    </form>
  );
}
export default TripFilterForm;
