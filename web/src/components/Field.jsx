// ช่องกรอกพร้อมป้ายชื่อ ใช้ร่วมกันในทุกฟอร์ม (หน้าตาตาม Input ใน Design System)
// as="textarea" ได้ช่องข้อความหลายบรรทัด (เช่น เนื้อหาบทความ), as="select" ได้ดรอปดาวน์
function Field({ label, hint, as: Input = 'input', ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-900">{label}</span>
      <Input
        {...inputProps}
        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 transition placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      {hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
export default Field;
