import { ButtonLink } from '../components/Button';
import Icon from '../components/Icon';
import usePageTitle from '../hooks/usePageTitle';

// ทุก URL ที่ไม่ตรงกับ Route ไหนเลยมาจบที่นี่ (path="*" ใน App.js)
function NotFound() {
  usePageTitle('ไม่พบหน้านี้');
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-500">
        <Icon name="mapPin" className="h-8 w-8" />
      </span>
      <p className="mt-5 text-5xl font-bold text-brand-500">404</p>
      <h1 className="mt-3 text-2xl font-bold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-gray-500">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
      <ButtonLink to="/" className="mt-6">
        กลับหน้าแรก
      </ButtonLink>
    </div>
  );
}
export default NotFound;
