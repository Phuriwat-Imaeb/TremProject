// ป้ายสถานะแบบมีจุดสีนำหน้า ตาม Design System: danger | warning | success | brand | info | neutral
const tones = {
  danger: 'bg-[#fbe3e3] text-[#c43d3d]',
  warning: 'bg-[#fff4d1] text-[#8a640b]',
  success: 'bg-[#dff3e6] text-[#2f8a54]',
  brand: 'bg-brand-100 text-brand-700',
  info: 'bg-[#e3edfc] text-[#2f66c4]',
  neutral: 'bg-gray-100 text-gray-600',
};

function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
export default Badge;
