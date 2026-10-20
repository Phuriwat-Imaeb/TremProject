import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../api/backend';
import Alert from '../components/Alert';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import { baht, thaiDay, thaiTime, todayInThai, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

// ฟอร์มเลือกเส้นทาง + วันที่ ค่าในช่องเป็น state ของฟอร์มเอง กด "ค้นหา" ถึงจะเขียนลง URL
function SearchForm({ routes, routeId, date, onSearch }) {
  const [form, setForm] = useState({ routeId, date });
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    onSearch(form);
  }

  return (
    <form onSubmit={submit} className="mb-6 grid gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <Field as="select" label="เส้นทาง" value={form.routeId} onChange={set('routeId')}>
        <option value="">ทุกเส้นทาง</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.origin} → {r.destination}
          </option>
        ))}
      </Field>
      <Field type="date" label="วันเดินทาง" min={todayInThai()} value={form.date} onChange={set('date')} />
      <Button type="submit">ค้นหา</Button>
    </form>
  );
}

function TripCard({ trip }) {
  const full = trip.seatsLeft === 0;
  return (
    <li className="rounded-md border border-gray-200 bg-white p-4">
      <Link to={`/trips/${trip.id}`} className="flex flex-wrap items-center justify-between gap-3 hover:opacity-90">
        <div>
          <p className="text-lg font-semibold text-teal-700">
            {thaiTime(trip.departAt)} → {thaiTime(trip.arriveAt)}
          </p>
          <p className="text-gray-700">
            {trip.route.origin} → {trip.route.destination}
          </p>
          <p className="text-sm text-gray-500">
            {thaiDay(trip.departAt)} · {VEHICLE_LABEL[trip.vehicle.kind]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{baht(trip.priceBaht)}</p>
          <p className={`text-sm ${full ? 'text-red-700' : 'text-gray-600'}`}>
            {full ? 'เต็มแล้ว' : `ว่าง ${trip.seatsLeft} ที่`}
          </p>
        </div>
      </Link>
    </li>
  );
}

// หน้าค้นหารอบรถ ตัวกรองอยู่ใน URL (?routeId=1&date=2026-10-21) กด back ได้ แชร์ลิงก์ได้
function Trips() {
  usePageTitle('ค้นหารอบรถ');
  const [params, setParams] = useSearchParams();
  const routeId = params.get('routeId') ?? '';
  const date = params.get('date') ?? '';

  const routes = useApi(() => api.listRoutes(), []);
  const { data, error, loading } = useApi(() => api.listTrips({ routeId, date }), [routeId, date]);

  function search(next) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  }

  return (
    <div>
      <PageHeader title="ค้นหารอบรถ" />
      {/* key: กด back จน URL เปลี่ยน ฟอร์มต้องเปลี่ยนตาม */}
      <SearchForm
        key={`${routeId}|${date}`}
        routes={routes.data?.items ?? []}
        routeId={routeId}
        date={date}
        onSearch={search}
      />
      {routes.error && <Alert>โหลดรายชื่อเส้นทางไม่สำเร็จ: {routes.error.message}</Alert>}
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && (
        <EmptyState message={routeId || date ? 'ไม่มีรอบรถที่ตรงกับที่เลือก ลองเปลี่ยนวันหรือเส้นทาง' : 'ยังไม่มีรอบรถที่เปิดขาย'} />
      )}
      <ul className="space-y-3">
        {data?.items.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </ul>
    </div>
  );
}
export default Trips;
