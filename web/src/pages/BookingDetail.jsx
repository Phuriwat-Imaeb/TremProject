import { Link, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

const STATUS = {
  confirmed: { label: 'จองแล้ว', className: 'bg-teal-100 text-teal-800' },
  cancelled: { label: 'ยกเลิกแล้ว', className: 'bg-gray-200 text-gray-700' },
};

// หน้าตั๋ว: การจองหนึ่งรายการ id มาจาก URL /bookings/:id (ของคนอื่น server ตอบ 404)
function BookingDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data: b, error, loading } = useApi(() => api.getBooking(id, token), [id, token]);
  usePageTitle(`การจอง #${id}`);

  const back = (
    <Link to="/trips" className="text-sm text-teal-700 hover:underline">
      ← ค้นหารอบรถ
    </Link>
  );

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <Alert>{error.message}</Alert>
      </div>
    );
  }

  const t = b.trip;
  const status = STATUS[b.status];
  return (
    <div className="space-y-4">
      {back}
      <article className="rounded-md border border-gray-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-gray-300 p-4">
          <h1 className="text-xl font-bold">การจอง #{b.id}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>{status.label}</span>
        </header>
        <dl className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-gray-500">เส้นทาง</dt>
            <dd className="text-lg font-semibold">
              {t.route.origin} → {t.route.destination}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">วันเวลาออก</dt>
            <dd className="text-lg font-semibold">
              {thaiDay(t.departAt)} {thaiTime(t.departAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">ที่นั่ง</dt>
            <dd className="text-lg font-semibold">{b.seats.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">รถ</dt>
            <dd>
              {VEHICLE_LABEL[t.vehicle.kind]} ทะเบียน {t.vehicle.plate}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">ยอดรวม</dt>
            <dd>{baht(b.totalBaht)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">จองเมื่อ</dt>
            <dd>
              {thaiDay(b.createdAt)} {thaiTime(b.createdAt)}
            </dd>
          </div>
        </dl>
        {b.status === 'confirmed' && t.status === 'cancelled' && (
          <div className="px-4 pb-4">
            <Alert>รอบรถนี้ถูกยกเลิกแล้ว</Alert>
          </div>
        )}
        {b.status === 'confirmed' && t.status === 'scheduled' && !t.departed && (
          <p className="border-t border-gray-200 p-4 text-sm text-gray-600">กรุณามาถึงจุดขึ้นรถก่อนเวลาออกอย่างน้อย 15 นาที</p>
        )}
      </article>
    </div>
  );
}
export default BookingDetail;
