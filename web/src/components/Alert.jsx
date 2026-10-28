import Icon from './Icon';

const styles = {
  error: 'bg-[#fbe3e3] text-[#c43d3d]',
  info: 'bg-[#e3edfc] text-[#2f66c4]',
  success: 'bg-[#dff3e6] text-[#2f8a54]',
};
const icons = { error: 'shield', info: 'sparkles', success: 'check' };

// กล่องข้อความ type: error | info | success (หน้าตาตามกล่อง error ของหน้า B01)
// error ใช้ role="alert" โปรแกรมอ่านหน้าจออ่านให้ทันที อย่างอื่นใช้ role="status" รอจังหวะว่างค่อยอ่าน
function Alert({ type = 'error', children }) {
  return (
    <p role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      <Icon name={icons[type]} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
export default Alert;
