import { Link } from 'react-router-dom';

// ปุ่มตัวกรองทรงแคปซูล เลือกอยู่ = พื้นน้ำตาลเข้ม ไม่ได้เลือก = ขอบเบจ
const chipClass = (selected) =>
  `inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium transition-colors ${
    selected ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
  }`;

function Chip({ selected = false, className = '', ...props }) {
  return <button type="button" aria-pressed={selected} className={`${chipClass(selected)} ${className}`} {...props} />;
}

export function ChipLink({ selected = false, className = '', ...props }) {
  return <Link aria-current={selected ? 'page' : undefined} className={`${chipClass(selected)} ${className}`} {...props} />;
}

export default Chip;
