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

  function remember({ token, member }) {
    setToken(token);
    setMember(member);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  }

  function logout() {
    setToken(null);
    setMember(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
  }

  // token ใน localStorage อาจหมดอายุไปแล้ว (ตั๋วอยู่ได้ 1 ชั่วโมง) ถามเซิร์ฟเวอร์อีกที ถ้าได้ 401 ก็ออกจากระบบ
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
      .catch((err) => {
        if (!cancelled && err.status === 401) logout();
      });
    return () => {
      cancelled = true;
    };
    // ถามใหม่เฉพาะตอน token เปลี่ยน logout ใช้แค่ setter ที่คงที่อยู่แล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(email, password) {
    const data = await api.login(email, password); // ผิดแล้ว backend.js จะ throw
    remember(data);
  }

  async function register(form) {
    await api.register(form);
    await login(form.email, form.password); // สมัครเสร็จ login ให้เลย
  }

  const value = { token, member, isLoggedIn: Boolean(token), login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
