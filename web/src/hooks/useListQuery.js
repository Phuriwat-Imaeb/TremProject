import { useSearchParams } from 'react-router-dom';

// คำค้นกับเลขหน้าของหน้ารายการ เก็บไว้ใน URL (?q=แมว&page=2) ไม่ใช่ใน state
// กด back/forward ได้ แชร์ลิงก์ได้ รีเฟรชแล้วยังอยู่หน้าเดิม
export default function useListQuery() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // ค้นใหม่ = กลับไปหน้า 1 เสมอ
  function setQ(next) {
    setParams(next ? { q: next } : {});
  }

  return { q, page, setQ };
}
