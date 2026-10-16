// ทุกคำขอไป Go วิ่งผ่านไฟล์นี้ หน้าเว็บไม่ต้องรู้จัก fetch เอง
// BASE ว่าง = ยิงไป origin เดียวกับหน้าเว็บ แล้ว dev server ส่งต่อให้ Go ที่ :8080 (ดู src/setupProxy.js)
// ตอน deploy ตั้ง REACT_APP_API_URL เป็น URL ของ API จริง
const BASE = process.env.REACT_APP_API_URL || '';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({ error: 'server ไม่ได้ตอบเป็น JSON' }));
  if (!res.ok) {
    // Go ตอบ error เป็น { error: { code, message } } ส่วนข้อความสำรองเป็นสตริงเฉย ๆ อ่านได้ทั้งสองแบบ
    const err = new Error(data.error?.message ?? data.error ?? `server ตอบกลับ ${res.status}`);
    err.status = res.status;
    err.code = data.error?.code;
    throw err;
  }
  return data;
}

// ---------- สมาชิก ----------
export function register({ email, password, displayName, phone }) {
  return apiFetch('/api/auth/register', { method: 'POST', body: { email, password, displayName, phone } });
}
export function login(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } }); // ได้ { token, member }
}
export function getMe(token) {
  return apiFetch('/api/me', { token });
}
