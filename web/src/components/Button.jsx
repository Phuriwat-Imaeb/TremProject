import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand-200 hover:bg-brand-50',
  light: 'bg-white text-brand-800 shadow-soft hover:bg-brand-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
  ghostDanger: 'text-red-700 hover:bg-red-50',
};

const base =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

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
