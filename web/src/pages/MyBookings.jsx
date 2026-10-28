import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import BookingStatus from '../components/BookingStatus';
import { ButtonLink } from '../components/Button';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import ProfileCard from '../components/ProfileCard';
import { baht, thaiDay, thaiTime } from '../format';
import useApi from '../hooks/useApi';
import useListQuery from '../hooks/useListQuery';
import usePageTitle from '../hooks/usePageTitle';

const TINTS = ['bg-tint-peach', 'bg-tint-butter', 'bg-tint-mint', 'bg-tint-sky'];

// การจองของฉัน ใหม่สุดก่อน แบ่งหน้าด้วย ?page= (หน้านี้ไม่มีช่องค้นหา)
function MyBookings() {
  usePageTitle('การจองของฉัน');
  const { token } = useAuth();
  const { page } = useListQuery();
  const { data, error, loading } = useApi(() => api.listMyBookings({ page }, token), [page, token]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <ProfileCard other={{ to: '/me', label: 'บัญชีของฉัน', icon: 'user' }} />
      <div className="min-w-0">
        <PageHeader title="การจองของฉัน">
          <ButtonLink to="/trips">
            <Icon name="plus" className="h-4 w-4" /> จองตั๋วเพิ่ม
          </ButtonLink>
        </PageHeader>
        {data && (
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-500">
              <Icon name="ticket" />
            </span>
            <span>
              <span className="block text-2xl font-bold">{data.total}</span>
              <span className="block text-xs text-gray-500">การจองทั้งหมด</span>
            </span>
          </div>
        )}
        {loading && !data && <Loading />}
        {error && <Alert>{error.message}</Alert>}
        {data?.items.length === 0 && <EmptyState message="ยังไม่มีการจอง" />}
        <ul className="space-y-3">
          {data?.items.map((b, i) => (
            <li key={b.id}>
              <Link
                to={`/bookings/${b.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
              >
                <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-xl ${TINTS[i % TINTS.length]}`}>
                  <Icon name="bus" className="h-7 w-7 text-brand-300" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {b.trip.route.origin} → {b.trip.route.destination} <BookingStatus booking={b} />
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {thaiDay(b.trip.departAt)} · ออก {thaiTime(b.trip.departAt)}
                  </p>
                  <p className="text-xs text-gray-500">
                    การจอง #{b.id} · ที่นั่ง {b.seats.join(', ')} · {baht(b.totalBaht)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold">
                  <Icon name="eye" className="h-4 w-4" /> ดูตั๋ว
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
      </div>
    </div>
  );
}
export default MyBookings;
