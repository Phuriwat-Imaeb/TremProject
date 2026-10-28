import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// ข้อความเด้งมุมล่างขวา บอกผลหลังทำรายการ เช่น "บันทึกแล้ว" แล้วหายเองใน 4 วินาที
//   const toast = useToast();  toast.success('ลบแล้ว');  toast.error(err.message);
// ต่อไปใช้แจ้งเตือนสดจาก WebSocket ได้ด้วย
const ToastContext = createContext(null);

const styles = {
  success: 'border-[#bfe5cd] bg-[#dff3e6] text-[#235f3b]',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  // useMemo: ค่าเดิมทุก render หน้าที่ใส่ toast ไว้ใน deps ของ effect จะได้ไม่ทำงานซ้ำโดยไม่ตั้งใจ
  const api = useMemo(
    () => ({ success: (m) => show('success', m), error: (m) => show('error', m) }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live: โปรแกรมอ่านหน้าจออ่านข้อความใหม่ให้เอง */}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2 px-4 sm:px-0">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${styles[t.type]}`}>
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="ปิดข้อความ" className="opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
