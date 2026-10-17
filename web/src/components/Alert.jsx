const styles = {
  error: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-800',
  success: 'bg-teal-50 text-teal-800',
};

// กล่องข้อความ type: error | info | success
// error ใช้ role="alert" โปรแกรมอ่านหน้าจออ่านให้ทันที อย่างอื่นใช้ role="status" รอจังหวะว่างค่อยอ่าน
function Alert({ type = 'error', children }) {
  return (
    <p role={type === 'error' ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm ${styles[type]}`}>
      {children}
    </p>
  );
}
export default Alert;
