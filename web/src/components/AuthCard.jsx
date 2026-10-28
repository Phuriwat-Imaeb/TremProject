import { APP_NAME } from '../config';

// กรอบของหน้าเข้าสู่ระบบ / สมัครสมาชิก: ฝั่งซ้ายพื้นเขียวเข้มแบบหน้าแรก ฝั่งขวาเป็นฟอร์ม (children)
// จอแคบเหลือแถบเขียวด้านบนแถบเดียว
function AuthCard({ title, tagline, children }) {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl md:grid-cols-[1fr_1.1fr]">
      <div className="relative overflow-hidden bg-teal-950 px-6 py-8 text-white sm:px-10 md:py-12">
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-teal-500/20 blur-2xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">{APP_NAME}</p>
        <p className="relative mt-3 text-2xl font-bold leading-tight sm:text-3xl">
          <span className="block">ทุกการเดินทาง</span>
          <span className="block text-teal-300">เริ่มต้นง่ายกว่าที่เคย</span>
        </p>
        {tagline && <p className="relative mt-4 text-sm text-teal-50/90">{tagline}</p>}
      </div>
      <div className="px-6 py-8 sm:px-10 md:py-12">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}
export default AuthCard;
