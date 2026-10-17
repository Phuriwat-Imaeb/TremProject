import { useCallback, useEffect, useState } from 'react';

// โหลดข้อมูลจาก API แบบมี 3 สถานะ: loading → ได้ data หรือได้ error
//   const { data, error, loading } = useApi(() => api.getArticle(id, token), [id, token]);
// load คือฟังก์ชันที่คืน Promise (คืน null = ไม่ต้องโหลด เช่น ฟอร์มสร้างใหม่ที่ไม่มีของเดิม)
// deps ใช้เหมือน deps ของ useEffect: ค่าไหนเปลี่ยน โหลดใหม่
export default function useApi(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0); // reload() เพิ่มเลขนี้ effect ข้างล่างจึงทำงานอีกรอบ

  useEffect(() => {
    const promise = load();
    if (!promise) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let cancelled = false; // ออกจากหน้าก่อนโหลดเสร็จ ไม่ต้อง setState แล้ว
    setState((s) => ({ ...s, error: null, loading: true })); // โหลดใหม่ ของเดิมยังโชว์อยู่ ไม่กระพริบ
    promise
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
    // deps มาจากคนเรียก lint ตรวจให้ไม่ได้ จึงปิดเฉพาะบรรทัดนี้ (load เปลี่ยนทุก render ห้ามใส่)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  // แก้ data ในมือโดยไม่ต้องโหลดใหม่ เช่น ลบแถวออกจากตารางหลังลบสำเร็จ
  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, setData, reload };
}
