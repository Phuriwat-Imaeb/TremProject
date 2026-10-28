import Badge from './Badge';

// ป้ายสถานะการจอง ใช้ทั้งหน้าตั๋วและหน้า "การจองของฉัน"
// รอบรถถูกยกเลิกหรือรถออกไปแล้ว แสดงต่างจาก "จองแล้ว" ธรรมดา ผู้โดยสารจะได้รู้ทันทีจากหน้ารายการ
function statusOf(b) {
  if (b.status === 'cancelled') return { label: 'ยกเลิกแล้ว', tone: 'neutral' };
  if (b.trip.status === 'cancelled') return { label: 'รอบรถถูกยกเลิก', tone: 'danger' };
  if (b.trip.departed) return { label: 'เดินทางแล้ว', tone: 'info' };
  return { label: 'จองแล้ว', tone: 'success' };
}

// ยกเลิกได้เมื่อยังจองอยู่ รอบยังเปิด และรถยังไม่ออก (server ตรวจซ้ำอีกชั้น ตอบ 409 ถ้าไม่ได้)
export const canCancel = (b) => b.status === 'confirmed' && b.trip.status === 'scheduled' && !b.trip.departed;

function BookingStatus({ booking }) {
  const { label, tone } = statusOf(booking);
  return <Badge tone={tone}>{label}</Badge>;
}
export default BookingStatus;
