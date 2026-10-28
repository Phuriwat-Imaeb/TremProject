import { Link, useParams } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../../format';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

// หลังบ้าน: รายชื่อผู้โดยสารของรอบ ไว้ให้พนักงานเช็กชื่อตอนขึ้นรถ (การจองที่ยกเลิกแล้วไม่อยู่ในรายชื่อ)
function TripPassengers() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data, error, loading } = useApi(() => api.tripPassengers(id, token), [id, token]);
  usePageTitle('รายชื่อผู้โดยสาร');

  const back = (
    <Link to="/admin/trips" className="text-sm text-teal-700 hover:underline">
      ← รอบรถทั้งหมด
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

  const { trip: t, items } = data;
  const seatTotal = items.reduce((n, p) => n + p.seats.length, 0);
  return (
    <div className="space-y-4">
      {back}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">รายชื่อผู้โดยสาร</h1>
        <p className="text-gray-700">
          {thaiDay(t.departAt)} {thaiTime(t.departAt)} · {t.route.origin} → {t.route.destination}
        </p>
        <p className="text-sm text-gray-500">
          {VEHICLE_LABEL[t.vehicle.kind]} {t.vehicle.plate} · จองแล้ว {seatTotal}/{t.vehicle.seatCount} ที่
        </p>
      </div>
      {t.status === 'cancelled' && <Alert>รอบนี้ถูกยกเลิกแล้ว</Alert>}
      {items.length === 0 ? (
        <EmptyState message="ยังไม่มีผู้โดยสาร" />
      ) : (
        // ตารางกว้างกว่าจอมือถือได้ ให้เลื่อนในกรอบตาราง หน้าเว็บทั้งหน้าไม่เลื่อนแนวนอน
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">ที่นั่ง</th>
                <th scope="col" className="px-4 py-2 font-medium">ชื่อ</th>
                <th scope="col" className="px-4 py-2 font-medium">เบอร์โทร</th>
                <th scope="col" className="px-4 py-2 font-medium">การจอง</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">ยอด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((p) => (
                <tr key={p.bookingId}>
                  <td className="px-4 py-2 font-semibold">{p.seats.join(', ')}</td>
                  <td className="px-4 py-2">{p.member.displayName}</td>
                  <td className="whitespace-nowrap px-4 py-2">{p.member.phone ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-500">#{p.bookingId}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">{baht(p.totalBaht)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default TripPassengers;
