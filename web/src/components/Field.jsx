// ช่องกรอกพร้อมป้ายชื่อ ใช้ร่วมกันในทุกฟอร์ม
// as="textarea" ได้ช่องข้อความหลายบรรทัด (เช่น เนื้อหาบทความ)
function Field({ label, hint, as: Input = 'input', ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <Input
        {...inputProps}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
export default Field;
