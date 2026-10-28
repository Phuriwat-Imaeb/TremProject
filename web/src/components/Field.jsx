import { useId } from 'react';

// ช่องกรอกพร้อมป้ายชื่อ ใช้ร่วมกันในทุกฟอร์ม
// as="textarea" ได้ช่องข้อความหลายบรรทัด (เช่น เนื้อหาบทความ)
function Field({ label, hint, as: Input = 'input', id: providedId, ...inputProps }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = `${id}-hint`;

  return (
    <div className="block">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <Input
        {...inputProps}
        id={id}
        aria-describedby={hint ? hintId : inputProps['aria-describedby']}
        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
      {hint && (
        <span id={hintId} className="mt-1.5 block text-xs text-slate-500">
          {hint}
        </span>
      )}
    </div>
  );
}
export default Field;
