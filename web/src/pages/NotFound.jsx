import { ButtonLink } from '../components/Button';
import usePageTitle from '../hooks/usePageTitle';

// ทุก URL ที่ไม่ตรงกับ Route ไหนเลยมาจบที่นี่ (path="*" ใน App.js)
function NotFound() {
  usePageTitle('ไม่พบหน้านี้');
  return (
    <div className="py-12 text-center">
      <p className="text-5xl font-bold text-teal-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-gray-600">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
      <ButtonLink to="/" className="mt-6">
        กลับหน้าแรก
      </ButtonLink>
    </div>
  );
}
export default NotFound;
