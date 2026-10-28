import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../api/backend';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import TripFilterForm from '../components/TripFilterForm';
import { baht, thaiDay, thaiTime, todayInThai, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

function TripCard({ trip }) {
  const full = trip.seatsLeft === 0;
  return (
    <li className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
      <Link to={`/trips/${trip.id}`} className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xl font-extrabold text-brand-700 transition group-hover:text-brand-800">
            {thaiTime(trip.departAt)} → {thaiTime(trip.arriveAt)}
          </p>
          <p className="mt-1 font-semibold text-slate-800">
            {trip.route.origin} → {trip.route.destination}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {thaiDay(trip.departAt)} · {VEHICLE_LABEL[trip.vehicle.kind]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-slate-950">{baht(trip.priceBaht)}</p>
          <p className={`mt-1 text-sm font-medium ${full ? 'text-red-700' : 'text-brand-700'}`}>
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
      <TripFilterForm
        key={`${routeId}|${date}`}
        routes={routes.data?.items ?? []}
        routeId={routeId}
        date={date}
        minDate={todayInThai()}
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
