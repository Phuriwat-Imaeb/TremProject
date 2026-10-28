import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button, { ButtonLink } from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { useToast } from '../../components/Toast';
import TripFilterForm from '../../components/TripFilterForm';
import { baht, thaiDay, thaiTime } from '../../format';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

// แก้/ยกเลิกได้เฉพาะรอบที่ยังเปิดขาย (server ตรวจซ้ำ ตอบ 409 TRIP_CLOSED)
const isOpen = (t) => t.status === 'scheduled' && !t.departed;

function tripState(t) {
  if (t.status === 'cancelled') return { label: 'ยกเลิกแล้ว', className: 'text-red-700' };
  if (t.departed) return { label: 'ออกไปแล้ว', className: 'text-gray-500' };
  return { label: 'เปิดขาย', className: 'text-brand-700' };
}

// หลังบ้าน: ทุกรอบรถ รวมที่ยกเลิก/ออกไปแล้ว กรองเส้นทาง/วัน แบ่งหน้า ตัวกรองทั้งหมดอยู่ใน URL
function AdminTrips() {
  usePageTitle('จัดการรอบรถ');
  const { token } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const routeId = params.get('routeId') ?? '';
  const date = params.get('date') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const routes = useApi(() => api.listRoutes(), []);
  const { data, error, loading, setData } = useApi(
    () => api.staffListTrips({ routeId, date, page }, token),
    [routeId, date, page, token]
  );

  const [toCancel, setToCancel] = useState(null); // รอบที่กำลังถามยืนยัน null = กล่องปิด
  const [cancelling, setCancelling] = useState(false);

  async function confirmCancel() {
    setCancelling(true);
    try {
      const updated = await api.cancelTrip(toCancel.id, token);
      setData((d) => ({ ...d, items: d.items.map((t) => (t.id === updated.id ? updated : t)) }));
      toast.success('ยกเลิกรอบแล้ว การจองในรอบนี้ถูกยกเลิกทั้งหมด');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
      setToCancel(null);
    }
  }

  // ค้นใหม่ = กลับไปหน้า 1 (ไม่ใส่ page)
  function search(next) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  }

  const newButton = <ButtonLink to="/admin/trips/new">เพิ่มรอบรถ</ButtonLink>;

  return (
    <div>
      <PageHeader title="จัดการรอบรถ">{newButton}</PageHeader>
      <TripFilterForm
        key={`${routeId}|${date}`}
        routes={routes.data?.items ?? []}
        routeId={routeId}
        date={date}
        onSearch={search}
      />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && <EmptyState message="ไม่มีรอบรถที่ตรงกับที่เลือก">{newButton}</EmptyState>}
      {data?.items.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {data.items.map((t) => {
            const state = tripState(t);
            const sold = t.vehicle.seatCount - t.seatsLeft;
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {thaiDay(t.departAt)} {thaiTime(t.departAt)} · {t.route.origin} → {t.route.destination}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className={state.className}>{state.label}</span> · {t.vehicle.plate} · {baht(t.priceBaht)} ·
                    จองแล้ว {sold}/{t.vehicle.seatCount} ที่
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <ButtonLink variant="ghost" to={`/admin/trips/${t.id}/passengers`}>
                    ผู้โดยสาร
                  </ButtonLink>
                  {isOpen(t) && (
                    <>
                      <ButtonLink variant="ghost" to={`/admin/trips/${t.id}/edit`}>
                        แก้ไข
                      </ButtonLink>
                      <Button variant="ghostDanger" onClick={() => setToCancel(t)}>
                        ยกเลิกรอบ
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
      <ConfirmDialog
        open={toCancel !== null}
        title="ยกเลิกรอบรถนี้?"
        message={
          toCancel &&
          `${thaiDay(toCancel.departAt)} ${thaiTime(toCancel.departAt)} ${toCancel.route.origin} → ${toCancel.route.destination} ` +
            `การจอง ${toCancel.vehicle.seatCount - toCancel.seatsLeft} ที่นั่งจะถูกยกเลิกทั้งหมด กู้คืนไม่ได้`
        }
        confirmLabel="ยกเลิกรอบ"
        danger
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
export default AdminTrips;
