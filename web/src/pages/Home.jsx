import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../components/Button';
import { APP_NAME } from '../config';
import usePageTitle from '../hooks/usePageTitle';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1566152704884-2610b8197648?auto=format&fit=crop&w=1400&q=85';

function Home() {
  usePageTitle(); // หน้าแรก ชื่อแท็บเป็นชื่อแอปอย่างเดียว
  const { isLoggedIn, member } = useAuth();
  return (
    <div className="space-y-16 pb-8">
      <section className="relative overflow-hidden rounded-3xl bg-brand-950 shadow-soft">
        <div className="grid min-h-hero lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
            <p className="mb-5 w-fit rounded-full border border-brand-700 bg-brand-900/70 px-4 py-2 text-sm font-semibold text-brand-100">
              จองง่าย เลือกที่นั่งเอง เดินทางสบาย
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              ทุกการเดินทาง
              <span className="block text-brand-300">เริ่มต้นง่ายกว่าที่เคย</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-brand-100 sm:text-lg">
              ค้นหารอบรถตู้และรถทัวร์ที่เหมาะกับคุณ เลือกที่นั่งจากผังจริง และจัดการการจองได้ครบในที่เดียว
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/trips" variant="light">
                ค้นหาเที่ยวรถ
              </ButtonLink>
              <ButtonLink to={isLoggedIn ? '/bookings' : '/register'} variant="secondary">
                {isLoggedIn ? 'ดูการจองของฉัน' : 'สมัครสมาชิก'}
              </ButtonLink>
            </div>
            {isLoggedIn && (
              <p className="mt-6 text-sm text-brand-200">
                ยินดีต้อนรับกลับมา คุณ{member?.displayName}
              </p>
            )}
          </div>
          <div className="relative min-h-80 lg:min-h-full">
            <img
              src={HERO_IMAGE}
              alt="รถโดยสารบนเส้นทางเดินทาง"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/10 to-transparent lg:bg-gradient-to-r lg:from-brand-950 lg:via-transparent lg:to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/90 p-4 shadow-soft backdrop-blur sm:left-auto sm:w-72">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-700">พร้อมออกเดินทาง</p>
              <p className="mt-1 font-bold text-slate-950">เลือกที่นั่งที่ชอบได้ทันที</p>
              <p className="mt-1 text-sm text-slate-600">เห็นสถานะที่นั่งแบบเรียลไทม์ก่อนยืนยัน</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto mb-9 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">{APP_NAME}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">จองครบ จบใน 3 ขั้นตอน</h2>
          <p className="mt-3 leading-7 text-slate-600">ออกแบบให้ทุกขั้นตอนตรงไปตรงมา เพื่อให้คุณใช้เวลากับการเดินทางมากกว่าการจอง</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['01', 'ค้นหาเที่ยวรถ', 'เลือกต้นทาง ปลายทาง และวันที่ต้องการเดินทาง'],
            ['02', 'เลือกที่นั่ง', 'ดูผังรถและเลือกตำแหน่งที่นั่งที่เหมาะกับคุณ'],
            ['03', 'ยืนยันการจอง', 'ตรวจสอบรายละเอียดและติดตามสถานะได้ทุกเมื่อ'],
          ].map(([number, title, description]) => (
            <article key={number} className="surface-card p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
              <span className="text-sm font-extrabold tracking-widest text-brand-500">{number}</span>
              <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid overflow-hidden rounded-3xl border border-brand-100 bg-brand-50 lg:grid-cols-[1fr_auto]">
        <div className="p-7 sm:p-10">
          <p className="text-sm font-bold text-brand-700">ข้อมูลที่ช่วยให้เดินทางดีขึ้น</p>
          <h2 className="mt-2 text-2xl font-extrabold text-brand-950 sm:text-3xl">อ่านคำแนะนำและเรื่องราวก่อนออกเดินทาง</h2>
          <p className="mt-3 max-w-2xl leading-7 text-brand-800">
            รวมบทความ ข่าวสาร และข้อมูลที่ควรรู้ เพื่อเตรียมตัวให้พร้อมสำหรับทุกเส้นทาง
          </p>
        </div>
        <div className="flex items-center px-7 pb-7 sm:px-10 lg:pb-0">
          <ButtonLink to="/articles" variant="primary">
            สำรวจบทความ
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
export default Home;
