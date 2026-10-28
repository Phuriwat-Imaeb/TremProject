import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import BookingStatus, { canCancel } from '../components/BookingStatus';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import Loading from '../components/Loading';
import { useToast } from '../components/Toast';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

// หน้าตั๋ว: การจองหนึ่งรายการ + ปุ่มยกเลิก id มาจาก URL /bookings/:id (ของคนอื่น server ตอบ 404)
function BookingDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const { data: b, error, loading, setData } = useApi(() => api.getBooking(id, token), [id, token]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  usePageTitle(`การจอง #${id}`);

  const back = (
    <Link to="/bookings" className="text-sm text-teal-700 hover:underline">
      ← การจองของฉัน
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

  async function cancel() {
    setCancelling(true);
    try {
      setData(await api.cancelBooking(b.id, token)); // server ตอบการจองหลังยกเลิก เอามาแทนของเดิมได้เลย
      toast.success(`ยกเลิกการจอง #${b.id} แล้ว`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  const t = b.trip;
  return (
    <div className="space-y-4">
      {back}
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-gray-200 bg-gradient-to-r from-teal-50 to-white p-5">
          <h1 className="text-xl font-bold">
            <span aria-hidden="true">🎫 </span>การจอง #{b.id}
          </h1>
          <BookingStatus booking={b} />
        </header>
        <dl className="grid gap-5 p-5 sm:grid-cols-2">
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
          {b.cancelledAt && (
            <div>
              <dt className="text-sm text-gray-500">ยกเลิกเมื่อ</dt>
              <dd>
                {thaiDay(b.cancelledAt)} {thaiTime(b.cancelledAt)}
              </dd>
            </div>
          )}
        </dl>
        {b.status === 'confirmed' && t.status === 'cancelled' && (
          <div className="px-4 pb-4">
            <Alert>รอบรถนี้ถูกยกเลิกแล้ว</Alert>
          </div>
        )}
        {canCancel(b) && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4">
            <p className="text-sm text-gray-600">กรุณามาถึงจุดขึ้นรถก่อนเวลาออกอย่างน้อย 15 นาที</p>
            <Button variant="ghostDanger" onClick={() => setConfirming(true)}>
              ยกเลิกการจอง
            </Button>
          </footer>
        )}
      </article>
      <ConfirmDialog
        open={confirming}
        title="ยกเลิกการจองนี้?"
        message={`ที่นั่ง ${b.seats.join(', ')} จะว่างให้คนอื่นจองทันที ยกเลิกแล้วกลับมาเป็นของเดิมไม่ได้`}
        confirmLabel="ยกเลิกการจอง"
        danger
        busy={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
export default BookingDetail;
