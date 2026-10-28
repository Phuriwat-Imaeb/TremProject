import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import BookingStatus from '../components/BookingStatus';
import { ButtonLink } from '../components/Button';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHero from '../components/PageHero';
import Pagination from '../components/Pagination';
import { baht, thaiDay, thaiTime } from '../format';
import useApi from '../hooks/useApi';
import useListQuery from '../hooks/useListQuery';
import usePageTitle from '../hooks/usePageTitle';

// การจองของฉัน ใหม่สุดก่อน แบ่งหน้าด้วย ?page= (หน้านี้ไม่มีช่องค้นหา)
function MyBookings() {
  usePageTitle('การจองของฉัน');
  const { token } = useAuth();
  const { page } = useListQuery();
  const { data, error, loading } = useApi(() => api.listMyBookings({ page }, token), [page, token]);

  return (
    <div>
      <PageHero
        title="การจองของฉัน"
        subtitle="ตั๋วทั้งหมดของคุณ ใหม่สุดอยู่บนสุด"
        actions={
          <ButtonLink to="/trips" variant="secondary" className="border-transparent text-teal-900">
            จองตั๋วเพิ่ม
          </ButtonLink>
        }
      />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && <EmptyState message="ยังไม่มีการจอง" />}
      <ul className="space-y-3">
        {data?.items.map((b) => (
          <li key={b.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <Link to={`/bookings/${b.id}`} className="flex flex-wrap items-start justify-between gap-3 hover:opacity-90">
              <div>
                <p className="font-semibold text-teal-700">
                  {b.trip.route.origin} → {b.trip.route.destination}
                </p>
                <p className="text-gray-700">
                  {thaiDay(b.trip.departAt)} · ออก {thaiTime(b.trip.departAt)}
                </p>
                <p className="text-sm text-gray-500">
                  การจอง #{b.id} · ที่นั่ง {b.seats.join(', ')} · {baht(b.totalBaht)}
                </p>
              </div>
              <BookingStatus booking={b} />
            </Link>
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
    </div>
  );
}
export default MyBookings;
