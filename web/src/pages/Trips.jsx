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
  const few = !full && trip.seatsLeft <= 3;
  const seats = full ? 'เต็มแล้ว' : `ว่าง ${trip.seatsLeft} ที่`;
  return (
    <li>
      {/* เส้นเวลาในการ์ดเป็นภาพตกแต่ง จึงบอกใจความทั้งใบให้โปรแกรมอ่านหน้าจอใน aria-label */}
      <Link
        to={`/trips/${trip.id}`}
        aria-label={`${thaiTime(trip.departAt)} → ${thaiTime(trip.arriveAt)} ${trip.route.origin} → ${trip.route.destination} · ${thaiDay(trip.departAt)} · ${VEHICLE_LABEL[trip.vehicle.kind]} · ${baht(trip.priceBaht)} · ${seats}`}
        className="group flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{thaiTime(trip.departAt)}</p>
            <p className="text-sm text-gray-500">{trip.route.origin}</p>
          </div>
          {/* เส้นเวลาเดินทาง: จุดต้นทาง ── รถ ── จุดปลายทาง */}
          <div aria-hidden="true" className="flex flex-1 items-center gap-1 text-teal-600">
            <span className="h-2 w-2 rounded-full border-2 border-teal-600" />
            <span className="h-px flex-1 border-t-2 border-dashed border-teal-200" />
            <span className="text-base">{trip.vehicle.kind === 'bus' ? '🚌' : '🚐'}</span>
            <span className="h-px flex-1 border-t-2 border-dashed border-teal-200" />
            <span className="h-2 w-2 rounded-full bg-teal-600" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{thaiTime(trip.arriveAt)}</p>
            <p className="text-sm text-gray-500">{trip.route.destination}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-dashed border-gray-200 pt-4 sm:block sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
          <div>
            <p className="text-xs text-gray-500">
              {thaiDay(trip.departAt)} · {VEHICLE_LABEL[trip.vehicle.kind]}
            </p>
            <p className="text-xl font-bold text-teal-700">{baht(trip.priceBaht)}</p>
          </div>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              full ? 'bg-red-50 text-red-700' : few ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
            }`}
          >
            {seats}
          </span>
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
