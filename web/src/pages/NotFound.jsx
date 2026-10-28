import { ButtonLink } from '../components/Button';
import usePageTitle from '../hooks/usePageTitle';

// ทุก URL ที่ไม่ตรงกับ Route ไหนเลยมาจบที่นี่ (path="*" ใน App.js)
function NotFound() {
  usePageTitle('ไม่พบหน้านี้');
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-teal-950 px-6 py-14 text-center text-white shadow-xl">
      <p className="text-6xl font-bold text-teal-300">404</p>
      <h1 className="mt-4 text-2xl font-bold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-teal-50/90">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
      <ButtonLink to="/" variant="secondary" className="mt-6 border-transparent text-teal-900">
        กลับหน้าแรก
      </ButtonLink>
    </div>
  );
}
export default NotFound;
