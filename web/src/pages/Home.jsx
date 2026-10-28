import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../components/Button';
import { APP_NAME } from '../config';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

// ขั้นตอนการจอง 3 ข้อ (ข้อความล้วน ไม่ต้องโหลดอะไร)
const STEPS = [
  { title: 'ค้นหาเที่ยวรถ', text: 'เลือกต้นทาง ปลายทาง และวันที่ต้องการเดินทาง' },
  { title: 'เลือกที่นั่ง', text: 'ดูผังรถและเลือกตำแหน่งที่นั่งที่เหมาะกับคุณ' },
  { title: 'ยืนยันการจอง', text: 'ตรวจสอบรายละเอียดและติดตามสถานะได้ทุกเวลา' },
];

const duration = (min) => (min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ''}` : `${min} นาที`);

// รูปฝั่งขวาของ hero อยู่ที่ public/hero.jpg ถ้ายังไม่มีไฟล์ (โหลดไม่ขึ้น) ก็ซ่อนรูป เหลือพื้นไล่สีแทน
function HeroImage() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative min-h-[240px] overflow-hidden bg-gradient-to-br from-teal-800 to-emerald-600 md:min-h-full">
      {!failed && (
        <img
          src={`${process.env.PUBLIC_URL}/hero.jpg`}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* ไล่สีจากพื้นเขียวเข้มของฝั่งข้อความ ให้รูปกลืนเข้าหากัน */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-950 via-teal-950/30 to-transparent md:bg-gradient-to-r" />
      <div className="absolute bottom-4 right-4 max-w-[16rem] rounded-xl bg-white/95 p-4 text-gray-900 shadow-lg">
        <p className="text-xs font-semibold text-teal-700">พร้อมออกเดินทาง</p>
        <p className="mt-0.5 font-bold">เลือกที่นั่งชอบได้ทันที</p>
        <p className="mt-1 text-xs text-gray-500">เห็นสถานะที่นั่งแบบเรียลไทม์ก่อนยืนยัน</p>
      </div>
    </div>
  );
}

function Home() {
  usePageTitle(); // หน้าแรก ชื่อแท็บเป็นชื่อแอปอย่างเดียว
  const { isLoggedIn, member } = useAuth();
  const routes = useApi(() => api.listRoutes(), []);
  const items = routes.data?.items ?? [];

  return (
    <div className="space-y-16">
      <section className="grid overflow-hidden rounded-3xl bg-teal-950 text-white shadow-xl md:grid-cols-[1.15fr_1fr]">
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="inline-block rounded-full border border-white/25 px-3 py-1 text-xs text-teal-100">
            {isLoggedIn ? `สวัสดี ${member?.displayName}` : 'จองง่าย เลือกที่นั่งเอง เดินทางสบาย'}
          </p>
          {/* ภาษาไทยไม่มีเว้นวรรคระหว่างคำ แยกเป็นสองบรรทัดเอง ไม่ให้เบราว์เซอร์ตัดกลางคำ */}
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
            <span className="block">ทุกการเดินทาง</span>
            <span className="block text-teal-300">เริ่มต้นง่ายกว่าที่เคย</span>
          </h1>
          <p className="mt-5 max-w-md text-teal-50/90">
            ค้นหารอบรถตู้และรถทัวร์ที่เหมาะกับคุณ เลือกที่นั่งจากผังจริง และจัดการการจองได้ครบในที่เดียว
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/trips" variant="secondary" className="border-transparent text-teal-900">
              ค้นหาเที่ยวรถ
            </ButtonLink>
            {isLoggedIn ? (
              <ButtonLink to="/bookings" variant="secondary" className="border-transparent text-teal-900">
                การจองของฉัน
              </ButtonLink>
            ) : (
              <ButtonLink to="/register" variant="secondary" className="border-transparent text-teal-900">
                สมัครสมาชิก
              </ButtonLink>
            )}
          </div>
        </div>
        <HeroImage />
      </section>

      <section aria-labelledby="steps" className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">{APP_NAME}</p>
        <h2 id="steps" className="mt-2 text-2xl font-bold sm:text-3xl">
          จองครบ จบใน 3 ขั้นตอน
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-gray-600">
          ออกแบบให้ทุกขั้นตอนตรงไปตรงมา เพื่อให้คุณใช้เวลากับการเดินทางมากกว่าการจอง
        </p>
        <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold text-teal-600">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {items.length > 0 && (
        <section aria-labelledby="popular">
          <h2 id="popular" className="mb-4 text-xl font-bold">
            เส้นทางที่เปิดให้บริการ
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/trips?routeId=${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                >
                  <span className="font-medium">
                    {r.origin} <span className="text-teal-600">→</span> {r.destination}
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                    ประมาณ {duration(r.durationMin)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
export default Home;
