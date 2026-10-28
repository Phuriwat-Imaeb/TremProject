import { Link } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import { ButtonLink } from '../../components/Button';
import Icon from '../../components/Icon';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../../format';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const DAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
// "2026-10-28" เป็นวันในสัปดาห์ (ตีความเป็นวันที่ล้วน ไม่มีเขตเวลา จึงไม่เลื่อนวัน)
const weekday = (date) => DAY[new Date(`${date}T00:00:00Z`).getUTCDay()];

// "10 นาทีที่แล้ว" แบบหยาบ ๆ พอให้รู้ว่าเกิดเมื่อไร
function ago(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} ชม.ที่แล้ว`;
  return `${Math.floor(min / 60 / 24)} วันที่แล้ว`;
}

function StatCard({ label, icon, value, note }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-500">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}

// กราฟแท่ง 7 วัน: แท่งส้ม = จองแล้ว แท่งเขียว = ยกเลิก ความสูงเทียบกับวันที่มากที่สุด
function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.flatMap((d) => [d.confirmed, d.cancelled]));
  const h = (n) => `${Math.round((n / max) * 100)}%`;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">การจอง 7 วันล่าสุด</h2>
        <p className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> จองแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-mint-600" /> ยกเลิก
          </span>
        </p>
      </div>
      <ul className="grid h-48 grid-cols-7 items-end gap-2 border-b border-gray-200" aria-label="จำนวนการจองรายวัน">
        {daily.map((d) => (
          <li key={d.date} className="flex h-full items-end justify-center gap-1">
            <span className="sr-only">{`${thaiDay(d.date)} จองแล้ว ${d.confirmed} ยกเลิก ${d.cancelled}`}</span>
            <span aria-hidden="true" className="w-3 rounded-t bg-brand-500 sm:w-4" style={{ height: h(d.confirmed) }} />
            <span aria-hidden="true" className="w-3 rounded-t bg-mint-600 sm:w-4" style={{ height: h(d.cancelled) }} />
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-3 grid grid-cols-7 text-center text-xs text-gray-500">
        {daily.map((d) => (
          <span key={d.date}>{weekday(d.date)}</span>
        ))}
      </div>
    </section>
  );
}

function Activity({ items }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-bold">กิจกรรมล่าสุด</h2>
      {items.length === 0 && <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีการจอง</p>}
      <ul className="space-y-4">
        {items.map((b) => {
          const cancelled = b.status === 'cancelled';
          return (
            <li key={b.id} className="flex gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${cancelled ? 'bg-[#fbe3e3] text-[#c43d3d]' : 'bg-brand-100 text-brand-500'}`}>
                <Icon name={cancelled ? 'x' : 'ticket'} className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-sm">
                <span className="block">
                  {b.member.displayName} {cancelled ? 'ยกเลิก' : 'จอง'} {b.trip.route.origin} → {b.trip.route.destination} ({b.seats.length} ที่)
                </span>
                <span className="block text-xs text-gray-500">{ago(b.cancelledAt ?? b.createdAt)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NextTrips({ trips }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 p-5">
        <h2 className="text-lg font-bold">รอบที่จะออกถัดไป</h2>
        <Link to="/admin/trips" className="text-sm font-semibold text-brand-700 hover:underline">
          ดูทั้งหมด
        </Link>
      </div>
      {trips.length === 0 ? (
        <p className="px-5 pb-8 text-center text-sm text-gray-500">ไม่มีรอบที่เปิดขาย</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-100 text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">รอบ</th>
                <th className="px-5 py-3 font-medium">เวลาออก</th>
                <th className="px-5 py-3 font-medium">ที่นั่ง</th>
                <th className="px-5 py-3 font-medium">สถานะ</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trips.map((t) => {
                const booked = t.vehicle.seatCount - t.seatsLeft;
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-tint-butter text-brand-500">
                          <Icon name="bus" className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {t.route.origin} → {t.route.destination}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {VEHICLE_LABEL[t.vehicle.kind]} {t.vehicle.plate} · {baht(t.priceBaht)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {thaiDay(t.departAt)} {thaiTime(t.departAt)}
                    </td>
                    <td className="px-5 py-3">
                      {booked}/{t.vehicle.seatCount}
                    </td>
                    <td className="px-5 py-3">
                      {t.seatsLeft === 0 ? <Badge tone="danger">เต็ม</Badge> : t.seatsLeft <= 3 ? <Badge tone="warning">ใกล้เต็ม</Badge> : <Badge tone="success">เปิดขาย</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ButtonLink to={`/admin/trips/${t.id}/passengers`} variant="secondary" size="sm">
                        <Icon name="eye" className="h-4 w-4" /> ผู้โดยสาร
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// หน้าแรกของหลังบ้าน (แบบ B02) ยิง GET /api/staff/stats ครั้งเดียวได้ทุกตัวเลข
function AdminDashboard() {
  usePageTitle('แดชบอร์ด');
  const { token, member } = useAuth();
  const { data, error, loading } = useApi(() => api.staffStats(token), [token]);

  return (
    <div className="space-y-6">
      <PageHeader title={`สวัสดี ${member?.displayName ?? ''} 👋`} subtitle={data ? `ภาพรวมวันที่ ${thaiDay(data.today)}` : 'ภาพรวมของระบบ'}>
        {member?.role === 'admin' && (
          <ButtonLink to="/admin/articles/new" variant="secondary">
            <Icon name="pencil" className="h-4 w-4" /> เขียนบทความ
          </ButtonLink>
        )}
        <ButtonLink to="/admin/trips/new">
          <Icon name="plus" className="h-4 w-4" /> เพิ่มรอบรถ
        </ButtonLink>
      </PageHeader>
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="การจองวันนี้" icon="ticket" value={data.bookingsToday} note={`ที่นั่ง ${data.seatsToday} ที่`} />
            <StatCard label="รายได้วันนี้" icon="sparkles" value={baht(data.revenueTodayBaht)} note="จากการจองที่ยังไม่ยกเลิก" />
            <StatCard label="รอบใน 7 วัน" icon="bus" value={data.upcomingTrips} note="รอบที่เปิดขายอยู่" />
            <StatCard label="ยกเลิกวันนี้" icon="x" value={data.daily.at(-1)?.cancelled ?? 0} note="การจองที่ถูกยกเลิก" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <DailyChart daily={data.daily} />
            <Activity items={data.recentBookings} />
          </div>
          <NextTrips trips={data.nextTrips} />
        </>
      )}
    </div>
  );
}
export default AdminDashboard;
