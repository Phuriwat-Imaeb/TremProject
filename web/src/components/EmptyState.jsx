// โชว์ตอนโหลดเสร็จแล้วแต่ไม่มีข้อมูลสักชิ้น children = ปุ่มชวนทำต่อ (ไม่ใส่ก็ได้)
function EmptyState({ message, children }) {
  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
      <p className="text-gray-600">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
export default EmptyState;
