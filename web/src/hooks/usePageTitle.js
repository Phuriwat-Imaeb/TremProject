import { useEffect } from 'react';
import { APP_NAME } from '../config';

// ตั้งชื่อแท็บเบราว์เซอร์เป็น "ชื่อหน้า · ชื่อแอป" ไม่ส่งชื่อหน้า (เช่นหน้าแรก) = ชื่อแอปอย่างเดียว
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
