// หัวหน้า: ชื่อหน้าทางซ้าย ปุ่มทางขวา (children) จอแคบปุ่มจะตกลงมาบรรทัดใหม่เอง
function PageHeader({ title, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="mb-2 block h-1 w-10 rounded-full bg-brand-400" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
export default PageHeader;
