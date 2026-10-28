import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Button, { ButtonLink } from '../components/Button';
import Loading from '../components/Loading';
import SeatMap from '../components/SeatMap';
import { useToast } from '../components/Toast';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import useLiveSeats from '../hooks/useLiveSeats';
import usePageTitle from '../hooks/usePageTitle';

// จองได้ครั้งละไม่เกิน 10 ที่ ตรงกับที่ server ตรวจ (NewBooking.seats maxItems ใน openapi.yaml)
export const MAX_SEATS = 10;

// รายละเอียดรอบรถ + ผังที่นั่ง + ปุ่มจอง id มาจาก URL /trips/:id
function TripDetail() {
  const { id } = useParams();
  const { isLoggedIn, token } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const trip = useApi(() => api.getTrip(id), [id]);
  const seats = useApi(() => api.getTripSeats(id), [id]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState(null);
  usePageTitle(trip.data ? `${trip.data.route.origin} → ${trip.data.route.destination}` : 'รอบรถ');

  // ผังที่นั่งแบบสด: มีคนจอง/ยกเลิกรอบนี้เมื่อไร server ส่งผังใหม่มาทาง WebSocket แล้วเราวาดใหม่ทันที
  const selectedRef = useRef(selected); // handler ข้างล่างถูกเรียกนอกจังหวะ render ต้องอ่านค่าล่าสุดผ่าน ref
  selectedRef.current = selected;
  const bookingRef = useRef(false); // ระหว่างที่เราจองเอง ที่นั่งของเราจะโผล่ในผังใหม่ด้วย ไม่ต้องเตือนว่าโดนแย่ง
  const live = useLiveSeats(id, (msg) => {
    if (msg.type === 'closed') {
      trip.reload(); // รอบถูกยกเลิก โหลดสถานะใหม่ หน้าจะซ่อนผังและขึ้นคำเตือนเอง
      return;
    }
    if (msg.type !== 'seats') return;
    const { type, ...map } = msg;
    seats.setData(map);
    const lost = selectedRef.current.filter((no) => map.taken.includes(no));
    if (lost.length > 0) {
      setSelected((s) => s.filter((no) => !map.taken.includes(no)));
      if (!bookingRef.current) toast.error(`ที่นั่ง ${lost.join(', ')} เพิ่งถูกคนอื่นจองไป เลือกที่อื่นแทนได้`);
    }
  });

  const back = (
    <Link to="/trips" className="text-sm text-teal-700 hover:underline">
      ← ค้นหารอบรถ
    </Link>
  );

  // โหลดครั้งแรกเท่านั้นที่โชว์ Loading ทั้งหน้า ตอน reload ของเดิมยังโชว์อยู่ ที่เลือกไว้ไม่หาย
  if (!trip.data && !trip.error) return <Loading />;
  if (!seats.data && !seats.error) return <Loading />;
  const error = trip.error ?? seats.error;
  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <Alert>{error.message}</Alert>
      </div>
    );
  }

  const t = trip.data;
  const closed = t.status === 'cancelled' || t.departed;
  // ที่เลือกไว้ แต่ผังล่าสุดบอกว่าไม่ว่างแล้ว (เช่น โหลดใหม่หลังมีคนจองตัดหน้า) ไม่นับ
  const picked = selected.filter((no) => !seats.data.taken.includes(no));
  const seatsLeft = seats.data.seatCount - seats.data.taken.length; // นับจากผังล่าสุด (อัปเดตสด) ไม่ใช่จากตอนโหลดหน้า

  function toggle(no) {
    setBookError(null);
    if (picked.includes(no)) setSelected(picked.filter((x) => x !== no));
    else if (picked.length < MAX_SEATS) setSelected([...picked, no].sort((a, b) => a - b)); // ครบแล้วกดเพิ่มไม่ได้ (มีข้อความบอกข้างล่าง)
  }

  async function book() {
    setSubmitting(true);
    setBookError(null);
    bookingRef.current = true;
    try {
      const b = await api.createBooking({ tripId: t.id, seats: picked }, token);
      toast.success(`จองสำเร็จ ที่นั่ง ${b.seats.join(', ')}`);
      navigate(`/bookings/${b.id}`);
    } catch (err) {
      bookingRef.current = false;
      setBookError(err.message);
      if (err.code === 'SEAT_TAKEN') seats.reload(); // มีคนตัดหน้า โหลดผังใหม่ให้เห็นว่าที่ไหนไม่ว่างแล้ว
      if (err.code === 'TRIP_CLOSED') trip.reload(); // รอบถูกยกเลิกหรือรถออกระหว่างเลือก
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {back}
      <section className="rounded-3xl bg-teal-950 p-6 text-white shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t.route.origin} → {t.route.destination}
        </h1>
        <p className="mt-2 text-teal-50">
          {thaiDay(t.departAt)} · ออก {thaiTime(t.departAt)} ถึงประมาณ {thaiTime(t.arriveAt)}
        </p>
        <p className="mt-1 text-sm text-teal-100">
          {VEHICLE_LABEL[t.vehicle.kind]} ทะเบียน {t.vehicle.plate} · ที่นั่งละ {baht(t.priceBaht)} · ว่าง {seatsLeft} จาก{' '}
          {t.vehicle.seatCount} ที่
        </p>
      </section>

      {t.status === 'cancelled' && <Alert>รอบนี้ถูกยกเลิกแล้ว</Alert>}
      {t.status !== 'cancelled' && t.departed && <Alert>รถรอบนี้ออกไปแล้ว</Alert>}

      {!closed && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">เลือกที่นั่ง</h2>
            {live && (
              <span className="flex items-center gap-1 text-xs text-teal-700">
                <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-teal-500" /> อัปเดตสด
              </span>
            )}
          </div>
          <SeatMap
            kind={seats.data.kind}
            seatCount={seats.data.seatCount}
            taken={seats.data.taken}
            selected={picked}
            onToggle={toggle}
          />
          <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
            <div aria-live="polite">
              {picked.length === 0 ? (
                <p className="text-gray-500">ยังไม่ได้เลือกที่นั่ง</p>
              ) : (
                <p>
                  ที่นั่ง {picked.join(', ')} · รวม <strong>{baht(picked.length * t.priceBaht)}</strong>
                </p>
              )}
              {picked.length >= MAX_SEATS && (
                <p className="mt-1 text-sm text-amber-700">จองได้ครั้งละไม่เกิน {MAX_SEATS} ที่นั่ง</p>
              )}
            </div>
            {bookError && <Alert>{bookError}</Alert>}
            {isLoggedIn ? (
              <Button onClick={book} disabled={picked.length === 0 || submitting} className="w-full sm:w-auto">
                {submitting ? 'กำลังจอง…' : picked.length ? `จอง ${picked.length} ที่นั่ง` : 'จองที่นั่ง'}
              </Button>
            ) : (
              // ไป login แล้วกลับมาหน้านี้ (Login อ่าน state.from) ที่เลือกไว้จะหาย ต้องเลือกใหม่
              <ButtonLink to="/login" state={{ from: pathname }} className="w-full sm:w-auto">
                เข้าสู่ระบบเพื่อจอง
              </ButtonLink>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
export default TripDetail;
