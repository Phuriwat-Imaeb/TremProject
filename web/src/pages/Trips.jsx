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
