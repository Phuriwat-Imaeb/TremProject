import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import SeatMap from '../components/SeatMap';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../format';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

// จองได้ครั้งละไม่เกิน 10 ที่ ตรงกับที่ server ตรวจ (NewBooking.seats maxItems ใน openapi.yaml)
export const MAX_SEATS = 10;

// รายละเอียดรอบรถ + ผังที่นั่ง id มาจาก URL /trips/:id
function TripDetail() {
  const { id } = useParams();
  const trip = useApi(() => api.getTrip(id), [id]);
  const seats = useApi(() => api.getTripSeats(id), [id]);
  const [selected, setSelected] = useState([]);
  usePageTitle(trip.data ? `${trip.data.route.origin} → ${trip.data.route.destination}` : 'รอบรถ');

  const back = (
    <Link to="/trips" className="text-sm text-teal-700 hover:underline">
      ← ค้นหารอบรถ
    </Link>
  );

  if (trip.loading || seats.loading) return <Loading />;
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

  function toggle(no) {
    setSelected((s) => {
      if (s.includes(no)) return s.filter((x) => x !== no);
      if (s.length >= MAX_SEATS) return s; // ครบแล้ว กดเพิ่มไม่ได้ (มีข้อความบอกข้างล่าง)
      return [...s, no].sort((a, b) => a - b);
    });
  }

  return (
    <div className="space-y-6">
      {back}
      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h1 className="text-2xl font-bold">
          {t.route.origin} → {t.route.destination}
        </h1>
        <p className="mt-1 text-gray-700">
          {thaiDay(t.departAt)} · ออก {thaiTime(t.departAt)} ถึงประมาณ {thaiTime(t.arriveAt)}
        </p>
        <p className="text-sm text-gray-500">
          {VEHICLE_LABEL[t.vehicle.kind]} ทะเบียน {t.vehicle.plate} · ที่นั่งละ {baht(t.priceBaht)} · ว่าง {t.seatsLeft} จาก{' '}
          {t.vehicle.seatCount} ที่
        </p>
      </section>

      {t.status === 'cancelled' && <Alert>รอบนี้ถูกยกเลิกแล้ว</Alert>}
      {t.status !== 'cancelled' && t.departed && <Alert>รถรอบนี้ออกไปแล้ว</Alert>}

      {!closed && (
        <section className="rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">เลือกที่นั่ง</h2>
          <SeatMap
            kind={seats.data.kind}
            seatCount={seats.data.seatCount}
            taken={seats.data.taken}
            selected={selected}
            onToggle={toggle}
          />
          <div className="mt-6 border-t border-gray-200 pt-4" aria-live="polite">
            {selected.length === 0 ? (
              <p className="text-gray-500">ยังไม่ได้เลือกที่นั่ง</p>
            ) : (
              <p>
                ที่นั่ง {selected.join(', ')} · รวม <strong>{baht(selected.length * t.priceBaht)}</strong>
              </p>
            )}
            {selected.length >= MAX_SEATS && (
              <p className="mt-1 text-sm text-amber-700">จองได้ครั้งละไม่เกิน {MAX_SEATS} ที่นั่ง</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
export default TripDetail;
