import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { APP_NAME } from '../config';
import useApi from '../hooks/useApi';
import Icon from './Icon';

// กรอบของหน้าเข้าสู่ระบบ / สมัครสมาชิก (แบบ F08, F09): ซ้ายพื้นส้ม ขวาพื้นครีมเป็นฟอร์ม
// จอแคบซ่อนฝั่งส้ม เหลือแต่ฟอร์ม ตัวเลขฝั่งซ้ายดึงจาก API จริง โหลดไม่ได้ก็ไม่โชว์
function AuthShell({ title, subtitle, children }) {
  const routes = useApi(() => api.listRoutes(), []);
  const trips = useApi(() => api.listTrips({ routeId: '', date: '' }), []);
  const stats = [
    routes.data && { value: routes.data.items.length, label: 'เส้นทาง' },
    trips.data && { value: trips.data.items.length, label: 'รอบเปิดขาย' },
  ].filter(Boolean);

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,620px)_1fr]">
      <aside className="hidden flex-col justify-center gap-8 bg-brand-500 px-16 py-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3 font-bold">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-500">
            <Icon name="bus" className="h-6 w-6" />
          </span>
          {APP_NAME}
        </Link>
        <span className="grid h-56 w-56 place-items-center rounded-[2.5rem] bg-brand-700/80">
          <Icon name="bus" className="h-28 w-28" strokeWidth={1.2} />
        </span>
        <div>
          <p className="text-4xl font-bold leading-tight">
            <span className="block">ทุกที่นั่งที่จอง</span>
            <span className="block">คือการเดินทางที่สบายกว่า</span>
          </p>
          <p className="mt-4 max-w-sm leading-7 text-brand-50">
            สมาชิกจองที่นั่งรถตู้และรถทัวร์ เลือกที่นั่งเองจากผังรถ ดูตั๋ว และยกเลิกการจองได้เอง
          </p>
        </div>
        {stats.length > 0 && (
          <div className="flex gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-brand-50">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
      <main className="flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <Icon name="chevronLeft" className="h-4 w-4" /> กลับหน้าแรก
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mb-8 mt-3 text-gray-500">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
export default AuthShell;
