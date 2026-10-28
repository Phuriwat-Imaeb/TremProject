import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../api/backend';
import Alert from '../components/Alert';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import TripCard from '../components/TripCard';
import TripFilterForm from '../components/TripFilterForm';
import { todayInThai } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

// วิธีเรียง (เรียงในเครื่อง server ส่งมาตามเวลาออกอยู่แล้ว)
const SORTS = {
  time: { label: 'ออกก่อน', compare: (a, b) => a.departAt.localeCompare(b.departAt) },
  price: { label: 'ราคาต่ำสุด', compare: (a, b) => a.priceBaht - b.priceBaht },
};

// หน้าค้นหารอบรถ ตัวกรองอยู่ใน URL (?routeId=1&date=2026-10-21) กด back ได้ แชร์ลิงก์ได้
function Trips() {
  usePageTitle('ค้นหารอบรถ');
  const [params, setParams] = useSearchParams();
  const routeId = params.get('routeId') ?? '';
  const date = params.get('date') ?? '';
  const [sort, setSort] = useState('time');

  const routes = useApi(() => api.listRoutes(), []);
  const { data, error, loading } = useApi(() => api.listTrips({ routeId, date }), [routeId, date]);

  function search(next) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  }

  const items = data ? [...data.items].sort(SORTS[sort].compare) : [];

  return (
    <div>
      <PageHeader
        title="ค้นหารอบรถ"
        subtitle="เลือกเส้นทางและวันเดินทาง แล้วกดเข้าไปเลือกที่นั่งจากผังรถได้เลย"
        crumbs={[{ to: '/', label: 'หน้าแรก' }]}
      />
      <div className="grid items-start gap-8 lg:grid-cols-[300px_1fr]">
        {/* key: กด back จน URL เปลี่ยน ฟอร์มต้องเปลี่ยนตาม */}
        <TripFilterForm
          key={`${routeId}|${date}`}
          stacked
          routes={routes.data?.items ?? []}
          routeId={routeId}
          date={date}
          minDate={todayInThai()}
          onSearch={search}
        />
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-500">{data ? `พบ ${data.items.length} รอบ` : ' '}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">เรียงตาม</span>
              {Object.entries(SORTS).map(([key, s]) => (
                <Chip key={key} selected={sort === key} onClick={() => setSort(key)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
          {routes.error && <Alert>โหลดรายชื่อเส้นทางไม่สำเร็จ: {routes.error.message}</Alert>}
          {loading && !data && <Loading />}
          {error && <Alert>{error.message}</Alert>}
          {data?.items.length === 0 && (
            <EmptyState
              message={routeId || date ? 'ไม่มีรอบรถที่ตรงกับที่เลือก ลองเปลี่ยนวันหรือเส้นทาง' : 'ยังไม่มีรอบรถที่เปิดขาย'}
            />
          )}
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((t, i) => (
              <TripCard key={t.id} trip={t} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
export default Trips;
