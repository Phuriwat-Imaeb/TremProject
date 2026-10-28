import Icon from './Icon';

// โชว์ตอนโหลดเสร็จแล้วแต่ไม่มีข้อมูลสักชิ้น children = ปุ่มชวนทำต่อ (ไม่ใส่ก็ได้)
function EmptyState({ message, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-500">
        <Icon name="bus" />
      </span>
      <p className="mt-3 text-gray-500">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
export default EmptyState;
