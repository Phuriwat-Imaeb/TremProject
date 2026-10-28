// หัวหน้าพื้นเขียวเข้มแบบเดียวกับหน้าแรก ใช้กับหน้าฝั่งผู้ใช้
// eyebrow = ป้ายเล็กเหนือชื่อหน้า, subtitle = คำอธิบายใต้ชื่อ, actions = ปุ่มมุมขวา
// children = ของที่วางในหัว เช่น ฟอร์มค้นหา (พื้นขาว จึงตั้งสีตัวอักษรกลับเป็นสีปกติ และตัดระยะห่างด้านล่างของฟอร์มออก)
function PageHero({ title, eyebrow, subtitle, actions, children }) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-teal-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
      <div aria-hidden="true" className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-500/20 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-3 inline-block rounded-full border border-white/25 px-3 py-1 text-xs text-teal-100">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-bold leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-teal-50/90">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6 text-gray-900 [&>form]:mb-0">{children}</div>}
    </section>
  );
}
export default PageHero;
