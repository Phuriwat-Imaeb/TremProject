import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api/backend';

// เก็บสถานะ login ไว้กลางแอป Navbar และทุกหน้าที่ต้อง login จะเห็นค่าเดียวกัน
const AuthContext = createContext(null);

const TOKEN_KEY = 'petfinder.token';
const MEMBER_KEY = 'petfinder.member';

export function AuthProvider({ children }) {
  // อ่านค่าจาก localStorage ตอนเริ่ม refresh หน้าแล้วจะยัง login อยู่
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [member, setMember] = useState(() => JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null'));
  // ข้อความบอกเหตุผลที่ถูกพาออกจากระบบ หน้า Login เอาไปโชว์
  const [notice, setNotice] = useState(null);

  function remember({ token, member }) {
    setToken(token);
    setMember(member);
    setNotice(null);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  }

  function logout() {
    setToken(null);
    setMember(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
  }

  // ตั๋วอยู่ได้ 1 ชั่วโมง ถ้าหมดระหว่างใช้งาน คำขอไหนได้ 401 ก็ออกจากระบบตรงนี้ที่เดียว
  // หน้าที่ต้อง login (ProtectedRoute) จะพาไป /login เอง แล้วกลับมาหน้าเดิมหลัง login ใหม่
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      logout();
      setNotice('หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
    });
    return () => api.setUnauthorizedHandler(null);
    // logout ใช้แค่ setter ที่คงที่อยู่แล้ว ลงทะเบียนครั้งเดียวพอ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // token ใน localStorage อาจหมดอายุไปแล้วตั้งแต่ปิดเว็บ ถามเซิร์ฟเวอร์อีกที (ได้ 401 → handler ข้างบนจัดการ)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .getMe(token)
      .then((m) => {
        if (cancelled) return;
        setMember(m);
        localStorage.setItem(MEMBER_KEY, JSON.stringify(m));
      })
      .catch(() => {}); // error อื่น เช่น เน็ตหลุด ใช้ข้อมูลเดิมใน localStorage ไปก่อน
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(email, password) {
    const data = await api.login(email, password); // ผิดแล้ว backend.js จะ throw
    remember(data);
  }

  async function register(form) {
    await api.register(form);
    await login(form.email, form.password); // สมัครเสร็จ login ให้เลย
  }

  // กดออกจากระบบเอง ไม่ต้องมีข้อความเตือน
  function signOut() {
    logout();
    setNotice(null);
  }

  const value = { token, member, isLoggedIn: Boolean(token), notice, login, register, logout: signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
