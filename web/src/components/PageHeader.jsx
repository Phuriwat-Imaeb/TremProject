// หัวหน้า: ชื่อหน้าทางซ้าย ปุ่มทางขวา (children) จอแคบปุ่มจะตกลงมาบรรทัดใหม่เอง
function PageHeader({ title, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
export default PageHeader;
