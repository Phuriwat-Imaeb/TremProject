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
export function changePassword(currentPassword, newPassword, token) {
  return apiFetch('/api/me/password', { method: 'PUT', body: { currentPassword, newPassword }, token }); // 204 ได้ null
}

// ต่อ query string ให้ path ข้ามค่าที่ว่าง เช่น withQuery('/api/articles', { q: 'แมว', page: 2 })
// → '/api/articles?q=%E0%B9%81...&page=2' (URLSearchParams เข้ารหัสภาษาไทยให้เอง)
export function withQuery(path, params) {
  const filled = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = new URLSearchParams(filled).toString();
  return qs ? `${path}?${qs}` : path;
}

// ---------- บทความ (แม่แบบ CRUD) ----------
// หน้าบ้าน: ใครก็อ่านได้ แนบ token มาด้วยถ้ามี (login แล้วจะเห็นเบอร์โทรคนเขียน)
// ได้ { items, page, pageSize, total }
export function listArticles({ q, page } = {}, token) {
  return apiFetch(withQuery('/api/articles', { q, page }), { token });
}
export function getArticle(id, token) {
  return apiFetch(`/api/articles/${id}`, { token });
}
// หลังบ้าน: เฉพาะ admin เห็นฉบับร่างด้วย
export function adminListArticles({ q, page } = {}, token) {
  return apiFetch(withQuery('/api/admin/articles', { q, page }), { token });
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

// ---------- หลังบ้าน: สมาชิก ----------
export function adminListMembers(token) {
  return apiFetch('/api/admin/members', { token });
}
// สมาชิกต้อง login ใหม่ บทบาทในตั๋วถึงจะเปลี่ยน
export function setMemberRole(id, role, token) {
  return apiFetch(`/api/admin/members/${id}/role`, { method: 'PUT', body: { role }, token });
}

// ---------- เส้นทางและรอบรถ (ใครก็ดูได้) ----------
export function listRoutes() {
  return apiFetch('/api/routes'); // ได้ { items }
}
// รอบที่ยังจองได้ routeId/date ไม่ส่ง = ไม่กรอง ได้ { items }
export function listTrips({ routeId, date } = {}) {
  return apiFetch(withQuery('/api/trips', { routeId, date }));
}
export function getTrip(id) {
  return apiFetch(`/api/trips/${id}`);
}
// ผังที่นั่ง ได้ { tripId, kind, seatCount, taken: [เลขที่ไม่ว่าง] }
export function getTripSeats(id) {
  return apiFetch(`/api/trips/${id}/seats`);
}
// ที่อยู่ WebSocket ผังที่นั่งแบบสด: http → ws, https → wss
// BASE ว่าง (dev) = ต่อ origin เดียวกับหน้าเว็บ แล้ว setupProxy ส่งต่อให้ Go (ตั้ง ws: true ไว้แล้ว)
export function liveSeatsURL(id) {
  const base = BASE || window.location.origin;
  return `${base.replace(/^http/, 'ws')}/api/trips/${id}/live`;
}

// ---------- การจอง (ต้องเข้าสู่ระบบ) ----------
// ที่นั่งไม่ว่าง → error.code = 'SEAT_TAKEN', รอบปิดแล้ว → 'TRIP_CLOSED'
export function createBooking({ tripId, seats }, token) {
  return apiFetch('/api/bookings', { method: 'POST', body: { tripId, seats }, token });
}
export function getBooking(id, token) {
  return apiFetch(`/api/bookings/${id}`, { token });
}
// การจองของฉัน ใหม่สุดก่อน ได้ { items, page, pageSize, total }
export function listMyBookings({ page } = {}, token) {
  return apiFetch(withQuery('/api/me/bookings', { page }), { token });
}
// ได้การจองหลังยกเลิกกลับมา ยกเลิกซ้ำ → 'WRONG_STATUS', รถออกแล้ว → 'TRIP_CLOSED'
export function cancelBooking(id, token) {
  return apiFetch(`/api/bookings/${id}/cancel`, { method: 'POST', token });
}

// ---------- หลังบ้าน: รอบรถ (staff หรือ admin) ----------
// ทุกรอบ รวมที่ยกเลิก/ออกไปแล้ว ได้ { items, page, pageSize, total }
export function staffListTrips({ routeId, date, page } = {}, token) {
  return apiFetch(withQuery('/api/staff/trips', { routeId, date, page }), { token });
}
// input = { routeId, vehicleId, departAt, priceBaht } ชนรอบเดิม → 'VEHICLE_BUSY'
export function createTrip(input, token) {
  return apiFetch('/api/staff/trips', { method: 'POST', body: input, token });
}
// แก้ได้แค่ { departAt, priceBaht }
export function updateTrip(id, input, token) {
  return apiFetch(`/api/staff/trips/${id}`, { method: 'PUT', body: input, token });
}
// การจองทั้งรอบถูกยกเลิกไปด้วย
export function cancelTrip(id, token) {
  return apiFetch(`/api/staff/trips/${id}/cancel`, { method: 'POST', token });
}
// ได้ { trip, items: [{ bookingId, member, seats, totalBaht, createdAt }] }
export function tripPassengers(id, token) {
  return apiFetch(`/api/staff/trips/${id}/passengers`, { token });
}
export function staffListVehicles(token) {
  return apiFetch('/api/staff/vehicles', { token });
}

// ---------- หลังบ้าน: เส้นทางและคันรถ (เฉพาะ admin) ----------
// ซ้ำ → 'DUPLICATE', ลบของที่มีรอบรถใช้อยู่ → 'IN_USE', ลดที่นั่งจนชนที่จองแล้ว → 'SEATS_IN_USE'
export function createRoute(input, token) {
  return apiFetch('/api/admin/routes', { method: 'POST', body: input, token });
}
export function updateRoute(id, input, token) {
  return apiFetch(`/api/admin/routes/${id}`, { method: 'PUT', body: input, token });
}
export function deleteRoute(id, token) {
  return apiFetch(`/api/admin/routes/${id}`, { method: 'DELETE', token });
}
export function createVehicle(input, token) {
  return apiFetch('/api/admin/vehicles', { method: 'POST', body: input, token });
}
export function updateVehicle(id, input, token) {
  return apiFetch(`/api/admin/vehicles/${id}`, { method: 'PUT', body: input, token });
}
export function deleteVehicle(id, token) {
  return apiFetch(`/api/admin/vehicles/${id}`, { method: 'DELETE', token });
}
