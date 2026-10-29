import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../components/Button';
import { ArticleArt, RouteArt, VehicleArt } from '../components/CardArt';
import Icon from '../components/Icon';
import TripCard from '../components/TripCard';
import TripFilterForm from '../components/TripFilterForm';
import { todayInThai } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

const TINTS = ['bg-tint-peach', 'bg-tint-mint', 'bg-tint-butter', 'bg-tint-sky'];

const STEPS = [
  { icon: 'search', title: '1. ค้นหารอบรถ', text: 'เลือกต้นทาง ปลายทาง และวันเดินทาง ดูรอบที่ยังเปิดขายทั้งหมด' },
  { icon: 'seat', title: '2. เลือกที่นั่งเอง', text: 'ดูผังรถจริง ที่นั่งที่มีคนจองจะเปลี่ยนสีให้เห็นทันทีแบบเรียลไทม์' },
  { icon: 'ticket', title: '3. รับตั๋วในเว็บ', text: 'จองแล้วได้ตั๋วทันที ยกเลิกเองได้จนถึงเวลารถออก' },
];

const duration = (min) => (min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ''}` : `${min} นาที`);
const thaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });

// หัวของแต่ละส่วน: ชื่อ คำอธิบาย และลิงก์ "ดูทั้งหมด" ทางขวา
function SectionHead({ title, subtitle, to, more }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-brand-700 hover:underline">
          {more}
        </Link>
      )}
    </div>
  );
}

// การ์ดตัวเลขลอยบนกล่องภาพของ hero
function FloatStat({ icon, tone, value, label, className }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ${className}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon name={icon} />
      </span>
      <span>
        <span className="block text-lg font-bold">{value}</span>
        <span className="block text-xs text-gray-500">{label}</span>
      </span>
    </div>
  );
}

function Home() {
  usePageTitle(); // หน้าแรก ชื่อแท็บเป็นชื่อแอปอย่างเดียว
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const routes = useApi(() => api.listRoutes(), []);
  const trips = useApi(() => api.listTrips({ routeId: '', date: '' }), []);
  const articles = useApi(() => api.listArticles({}), []);
  const routeItems = routes.data?.items ?? [];
  const tripItems = trips.data?.items ?? [];
  const articleItems = articles.data?.items.slice(0, 3) ?? [];

  // กล่องค้นหาบนหน้าแรกพาไปหน้าค้นหารอบรถพร้อมตัวกรองใน URL
  function search(next) {
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v)).toString();
    navigate(q ? `/trips?${q}` : '/trips');
  }

  return (
    <div>
      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-700">
              <Icon name="heart" className="h-4 w-4" /> จองง่าย เลือกที่นั่งเอง เดินทางสบาย
            </p>
            {/* ภาษาไทยไม่มีเว้นวรรคระหว่างคำ แยกสองบรรทัดเอง ไม่ให้เบราว์เซอร์ตัดกลางคำ */}
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              <span className="block">ทุกการเดินทาง</span>
              <span className="block">เริ่มต้นง่ายกว่าที่เคย</span>
            </h1>
            <p className="mt-5 max-w-lg leading-7 text-gray-500">
              ค้นหารอบรถตู้และรถทัวร์ เลือกที่นั่งจากผังรถจริง เห็นที่ว่างแบบเรียลไทม์ และจัดการการจองได้ครบในที่เดียว
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink to="/trips">
                <Icon name="search" className="h-4 w-4" /> ค้นหาเที่ยวรถ
              </ButtonLink>
              <ButtonLink to={isLoggedIn ? '/bookings' : '/register'} variant="secondary">
                <Icon name="ticket" className="h-4 w-4" /> {isLoggedIn ? 'การจองของฉัน' : 'สมัครสมาชิก'}
              </ButtonLink>
            </div>
            <div className="mt-8 [&>form]:mb-0 [&>form]:shadow-sm">
              <TripFilterForm routes={routeItems} routeId="" date="" minDate={todayInThai()} onSearch={search} />
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md rounded-[2rem] bg-brand-100">
            {/* ภาพอยู่ในกล่องชั้นใน ตัดขอบมนได้โดยไม่ตัดการ์ดตัวเลขที่ยื่นออกนอกกล่อง */}
            <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
              <VehicleArt className="absolute inset-x-0 bottom-0 h-auto w-full" />
            </div>
            {trips.data && (
              <FloatStat icon="ticket" tone="bg-brand-100 text-brand-500" value={`${tripItems.length} รอบ`} label="เปิดขายตอนนี้" className="right-3 top-8 lg:-right-3" />
            )}
            {routes.data && (
              <FloatStat icon="route" tone="bg-mint-50 text-mint-600" value={`${routeItems.length} เส้นทาง`} label="ให้บริการทุกวัน" className="bottom-14 left-3 lg:-left-4" />
            )}
          </div>
        </div>
      </section>

      {tripItems.length > 0 && (
        <section className="bg-gray-50 pb-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead title="รอบรถที่กำลังจะออก" subtitle="ที่นั่งยังว่าง กดเข้าไปเลือกที่นั่งได้เลย" to="/trips" more="ดูทั้งหมด" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {tripItems.slice(0, 4).map((t, i) => (
                <TripCard key={t.id} trip={t} index={i} />
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead title="ใช้งานง่ายใน 3 ขั้นตอน" />
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.title} className="rounded-2xl bg-gray-50 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white">
                  <Icon name={s.icon} />
                </span>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {routeItems.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead title="เส้นทางที่ให้บริการ" subtitle="กดที่เส้นทางเพื่อดูรอบรถทั้งหมดของเส้นทางนั้น" to="/trips" more="ดูรอบทั้งหมด" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {routeItems.map((r, i) => (
                <li key={r.id}>
                  <Link
                    to={`/trips?routeId=${r.id}`}
                    className="block overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className={`h-28 ${TINTS[i % TINTS.length]}`}>
                      <RouteArt />
                    </div>
                    <div className="p-5">
                      <p className="font-bold">
                        {r.origin} → {r.destination}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <Icon name="clock" className="h-4 w-4 text-brand-500" /> ประมาณ {duration(r.durationMin)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {articleItems.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead title="บทความน่ารู้" subtitle="ข่าวสารและเคล็ดลับก่อนออกเดินทาง" to="/articles" more="อ่านทั้งหมด" />
            <ul className="grid gap-5 md:grid-cols-3">
              {articleItems.map((a, i) => (
                <li key={a.id}>
                  <Link
                    to={`/articles/${a.id}`}
                    className="block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {a.coverUrl ? (
                      <img src={a.coverUrl} alt="" className="h-36 w-full object-cover" />
                    ) : (
                      <div className={`h-36 ${TINTS[i % TINTS.length]}`}>
                        <ArticleArt />
                      </div>
                    )}
                    <div className="p-5">
                      <p className="text-xs text-gray-500">{thaiDate(a.createdAt)}</p>
                      <p className="mt-1 font-bold">{a.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-white pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-brand-500 px-8 py-10 text-white sm:px-12">
            <div>
              <h2 className="text-2xl font-bold">{isLoggedIn ? 'พร้อมออกเดินทางรอบถัดไปหรือยัง' : 'เป็นสมาชิกแล้วจองได้ในไม่กี่คลิก'}</h2>
              <p className="mt-1 text-brand-50">
                {isLoggedIn ? 'ดูตั๋วที่จองไว้ หรือหารอบใหม่ได้ทุกเมื่อ' : 'สมัครฟรี จองที่นั่ง ดูตั๋ว และยกเลิกการจองได้เองทั้งหมด'}
              </p>
            </div>
            <ButtonLink to={isLoggedIn ? '/bookings' : '/register'} variant="light">
              {isLoggedIn ? 'ดูการจองของฉัน' : 'สมัครสมาชิกฟรี'}
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
export default Home;
