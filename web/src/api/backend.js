// ทุกคำขอไป Go วิ่งผ่านไฟล์นี้ หน้าเว็บไม่ต้องรู้จัก fetch เอง
// BASE ว่าง = ยิงไป origin เดียวกับหน้าเว็บ แล้ว dev server ส่งต่อให้ Go ที่ :8080 (ดู src/setupProxy.js)
// ตอน deploy ตั้ง REACT_APP_API_URL เป็น URL ของ API จริง (ตัด / ท้ายทิ้ง กันได้ //api/...)
const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

// AuthProvider ฝากฟังก์ชันไว้ที่นี่: คำขอที่แนบตั๋วไปแล้วได้ 401 = ตั๋วหมดอายุ/ใช้ไม่ได้ ให้ออกจากระบบ
// (คำขอที่ไม่ได้แนบตั๋ว เช่น login รหัสผิด ก็ได้ 401 แต่แบบนั้นไม่เกี่ยวกับตั๋ว จึงไม่เรียก)
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

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
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
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

// ---------- บทความ (แม่แบบ CRUD) ----------
// หน้าบ้าน: ใครก็อ่านได้ แนบ token มาด้วยถ้ามี (login แล้วจะเห็นเบอร์โทรคนเขียน)
export function listArticles(token) {
  return apiFetch('/api/articles', { token });
}
export function getArticle(id, token) {
  return apiFetch(`/api/articles/${id}`, { token });
}
// หลังบ้าน: เฉพาะ admin เห็นฉบับร่างด้วย
export function adminListArticles(token) {
  return apiFetch('/api/admin/articles', { token });
}
export function adminGetArticle(id, token) {
  return apiFetch(`/api/admin/articles/${id}`, { token });
}
export function createArticle(input, token) {
  return apiFetch('/api/admin/articles', { method: 'POST', body: input, token });
}
export function updateArticle(id, input, token) {
  return apiFetch(`/api/admin/articles/${id}`, { method: 'PUT', body: input, token });
}
export function deleteArticle(id, token) {
  return apiFetch(`/api/admin/articles/${id}`, { method: 'DELETE', token });
}
