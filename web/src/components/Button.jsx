import { Link } from 'react-router-dom';

// ปุ่มตาม Design System: Primary (ส้ม), Teal (เขียว), Outline, Ghost, Danger มีสองขนาด md / sm
// ชื่อ variant "secondary" ใช้กับปุ่มขอบขาว (Outline ในแบบ) เพราะทั้งเว็บเรียกชื่อนี้อยู่แล้ว
const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  teal: 'bg-mint-600 text-white hover:bg-mint-700',
  secondary: 'border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50',
  light: 'bg-white text-gray-900 hover:bg-brand-50',
  danger: 'bg-[#d64545] text-white hover:bg-red-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
  ghostDanger: 'text-red-700 hover:bg-red-50',
};

const sizes = {
  md: 'min-h-11 rounded-xl px-5 text-sm',
  sm: 'min-h-8 rounded-lg px-3 text-xs',
};

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// type ตั้งต้นเป็น "button" กันกดแล้วเผลอส่งฟอร์ม ปุ่มส่งฟอร์มต้องใส่ type="submit" เอง
function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

// ลิงก์ที่หน้าตาเป็นปุ่ม เช่น "เพิ่มรอบรถ" (ไปหน้าอื่น จึงต้องเป็น <a> ไม่ใช่ <button>)
export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export default Button;
