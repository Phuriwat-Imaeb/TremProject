// ป้ายสถานะการจอง ใช้ทั้งหน้าตั๋วและหน้า "การจองของฉัน"
// รอบรถถูกยกเลิกหรือรถออกไปแล้ว แสดงต่างจาก "จองแล้ว" ธรรมดา ผู้โดยสารจะได้รู้ทันทีจากหน้ารายการ
function statusOf(b) {
  if (b.status === 'cancelled') return { label: 'ยกเลิกแล้ว', className: 'bg-gray-200 text-gray-700' };
  if (b.trip.status === 'cancelled') return { label: 'รอบรถถูกยกเลิก', className: 'bg-red-100 text-red-800' };
  if (b.trip.departed) return { label: 'เดินทางแล้ว', className: 'bg-sky-100 text-sky-800' };
  return { label: 'จองแล้ว', className: 'bg-teal-100 text-teal-800' };
}

// ยกเลิกได้เมื่อยังจองอยู่ รอบยังเปิด และรถยังไม่ออก (server ตรวจซ้ำอีกชั้น ตอบ 409 ถ้าไม่ได้)
export const canCancel = (b) => b.status === 'confirmed' && b.trip.status === 'scheduled' && !b.trip.departed;

function BookingStatus({ booking }) {
  const { label, className } = statusOf(booking);
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${className}`}>{label}</span>;
}
export default BookingStatus;
