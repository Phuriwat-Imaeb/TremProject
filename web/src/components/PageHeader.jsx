import { Link } from 'react-router-dom';

// หัวหน้าตามแบบ: breadcrumb เล็ก ชื่อหน้าตัวใหญ่ คำอธิบาย และปุ่มทางขวา (children)
//   <PageHeader title="ค้นหารอบรถ" subtitle="..." crumbs={[{ to: '/', label: 'หน้าแรก' }]}>ปุ่ม</PageHeader>
// จอแคบปุ่มจะตกลงมาบรรทัดใหม่เอง
function PageHeader({ title, subtitle, crumbs, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="breadcrumb" className="mb-3 text-xs text-gray-500">
            {crumbs.map((c) => (
              <span key={c.to}>
                <Link to={c.to} className="hover:text-gray-900">
                  {c.label}
                </Link>
                {' / '}
              </span>
            ))}
            <span>{title}</span>
          </nav>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
export default PageHeader;
