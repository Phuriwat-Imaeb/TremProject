import { Link } from 'react-router-dom';
import { baht, thaiDay, thaiTime, VEHICLE_LABEL } from '../format';
import Badge from './Badge';
import Icon from './Icon';

// พื้นสีอ่อนของรูปการ์ด วนตามลำดับ การ์ดที่อยู่ติดกันจะได้สีไม่ซ้ำกัน (เหมือนการ์ดประกาศในแบบ)
const TINTS = ['bg-tint-peach', 'bg-tint-butter', 'bg-tint-mint', 'bg-tint-sky'];

export function seatBadge(seatsLeft) {
  if (seatsLeft === 0) return <Badge tone="danger">เต็มแล้ว</Badge>;
  if (seatsLeft <= 3) return <Badge tone="warning">{`ว่าง ${seatsLeft} ที่`}</Badge>;
  return <Badge tone="success">{`ว่าง ${seatsLeft} ที่`}</Badge>;
}

// การ์ดรอบรถหนึ่งใบ ทั้งใบเป็นลิงก์ไปหน้าเลือกที่นั่ง index ใช้เลือกสีพื้น
function TripCard({ trip, index = 0 }) {
  return (
    <li>
      <Link
        to={`/trips/${trip.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className={`relative grid h-36 place-items-center ${TINTS[index % TINTS.length]}`}>
          <span className="absolute left-3 top-3">{seatBadge(trip.seatsLeft)}</span>
          <Icon name="bus" className="h-14 w-14 text-brand-300" strokeWidth={1.5} />
        </div>
        <div className="space-y-2 p-5">
          <p className="text-lg font-bold text-gray-900">
            {trip.route.origin} → {trip.route.destination}
          </p>
          <p className="text-sm text-gray-500">
            {VEHICLE_LABEL[trip.vehicle.kind]} · {trip.vehicle.seatCount} ที่นั่ง
          </p>
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <Icon name="clock" className="h-4 w-4 text-brand-500" />
            {thaiTime(trip.departAt)} → {thaiTime(trip.arriveAt)}
          </p>
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <Icon name="calendar" className="h-4 w-4 text-brand-500" />
            {thaiDay(trip.departAt)}
          </p>
          <p className="pt-1 text-lg font-bold text-brand-600">{baht(trip.priceBaht)}</p>
        </div>
      </Link>
    </li>
  );
}
export default TripCard;
