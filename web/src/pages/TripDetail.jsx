import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Button, { ButtonLink } from '../components/Button';
import Icon from '../components/Icon';
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
    <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
      <Link to="/" className="hover:text-gray-900">
        หน้าแรก
      </Link>
      <Icon name="chevronRight" className="h-3.5 w-3.5" />
      <Link to="/trips" className="hover:text-gray-900">
        ← ค้นหารอบรถ
      </Link>
    </nav>
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

  const status = t.status === 'cancelled' ? ['danger', 'รอบถูกยกเลิก'] : t.departed ? ['neutral', 'รถออกแล้ว'] : ['success', 'เปิดจอง'];
  const rows = [
    ['วันเดินทาง', thaiDay(t.departAt)],
    ['เวลาออก', `${thaiTime(t.departAt)} น.`],
    ['ถึงประมาณ', `${thaiTime(t.arriveAt)} น.`],
    ['รถ', `${VEHICLE_LABEL[t.vehicle.kind]} ทะเบียน ${t.vehicle.plate}`],
    ['ราคาต่อที่นั่ง', baht(t.priceBaht)],
    ['ที่นั่งว่าง', `ว่าง ${seatsLeft} จาก ${t.vehicle.seatCount} ที่`],
  ];

  return (
    <div className="space-y-6">
      {back}
      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl bg-tint-peach p-5 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">เลือกที่นั่ง</h2>
            {!closed && live && (
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-mint-600">
                <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-mint-600" /> อัปเดตสด
              </span>
            )}
          </div>
          {closed ? (
            <p className="rounded-2xl bg-white/70 px-4 py-12 text-center text-gray-500">รอบนี้ปิดการจองแล้ว</p>
          ) : (
            <SeatMap
              kind={seats.data.kind}
              seatCount={seats.data.seatCount}
              taken={seats.data.taken}
              selected={picked}
              onToggle={toggle}
            />
          )}
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone={status[0]}>{status[1]}</Badge>
            <Badge>รอบ #{t.id}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.route.origin} → {t.route.destination}
          </h1>
          <dl className="divide-y divide-gray-200">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {t.status === 'cancelled' && <Alert>รอบนี้ถูกยกเลิกแล้ว</Alert>}
          {t.status !== 'cancelled' && t.departed && <Alert>รถรอบนี้ออกไปแล้ว</Alert>}

          {!closed && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4" aria-live="polite">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-600">
                  <Icon name="seat" />
                </span>
                <div className="min-w-0">
                  {picked.length === 0 ? (
                    <p className="text-gray-500">ยังไม่ได้เลือกที่นั่ง</p>
                  ) : (
                    <p>
                      ที่นั่ง {picked.join(', ')} · รวม <strong>{baht(picked.length * t.priceBaht)}</strong>
                    </p>
                  )}
                  {picked.length >= MAX_SEATS && (
                    <p className="mt-1 text-sm text-[#8a640b]">จองได้ครั้งละไม่เกิน {MAX_SEATS} ที่นั่ง</p>
                  )}
                </div>
              </div>
              {bookError && <Alert>{bookError}</Alert>}
              {isLoggedIn ? (
                <Button onClick={book} disabled={picked.length === 0 || submitting} className="w-full">
                  <Icon name="ticket" className="h-4 w-4" />
                  {submitting ? 'กำลังจอง…' : picked.length ? `จอง ${picked.length} ที่นั่ง` : 'จองที่นั่ง'}
                </Button>
              ) : (
                // ไป login แล้วกลับมาหน้านี้ (Login อ่าน state.from) ที่เลือกไว้จะหาย ต้องเลือกใหม่
                <ButtonLink to="/login" state={{ from: pathname }} className="w-full">
                  เข้าสู่ระบบเพื่อจอง
                </ButtonLink>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export default TripDetail;
