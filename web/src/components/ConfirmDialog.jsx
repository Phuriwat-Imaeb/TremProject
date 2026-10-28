import { useEffect } from 'react';
import Button from './Button';

// กล่องถามยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ (ใช้แทน window.confirm ที่หน้าตาแล้วแต่เบราว์เซอร์)
// คนเรียกถือ state ว่าเปิดอยู่ไหม: open, แล้วรับผลทาง onConfirm / onCancel
// busy = กำลังรอ server ปุ่มกดซ้ำไม่ได้
function ConfirmDialog({ open, title, message, confirmLabel = 'ยืนยัน', danger = false, busy = false, onConfirm, onCancel }) {
  // กด Esc = ยกเลิก
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // คลิกในกล่องไม่นับเป็นคลิกพื้นหลัง
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          {/* โฟกัสที่ "ยกเลิก" ก่อน เผลอกด Enter จะได้ไม่ลบทันที */}
          <Button variant="secondary" onClick={onCancel} disabled={busy} autoFocus>
            ยกเลิก
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'กำลังทำรายการ…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmDialog;
