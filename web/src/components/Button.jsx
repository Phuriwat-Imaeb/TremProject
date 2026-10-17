import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-teal-700 hover:bg-teal-50',
  ghostDanger: 'text-red-700 hover:bg-red-50',
};

const base =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50';

// ปุ่มหน้าตาเดียวกันทั้งเว็บ variant: primary | secondary | danger | ghost | ghostDanger
// type ตั้งต้นเป็น "button" กันกดแล้วเผลอส่งฟอร์ม ปุ่มส่งฟอร์มต้องใส่ type="submit" เอง
function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

// ลิงก์ที่หน้าตาเป็นปุ่ม เช่น "เขียนบทความใหม่" (ไปหน้าอื่น จึงต้องเป็น <a> ไม่ใช่ <button>)
export function ButtonLink({ variant = 'primary', className = '', ...props }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export default Button;
