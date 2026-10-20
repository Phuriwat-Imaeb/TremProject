import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as api from './api/backend';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';

// ตัวช่วยของเทสต์ (ไม่ใช่ไฟล์เทสต์ เพราะชื่อไม่ลงท้าย .test)
// ไฟล์เทสต์ที่ใช้ต้อง jest.mock('.../api/backend') เอง ตัวช่วยนี้จะได้ api ปลอมตัวเดียวกัน

// render หน้าพร้อมของที่แอปจริงครอบไว้ (Router, Toast, Auth) เริ่มที่ URL route
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

// จำลองว่า login ไว้แล้ว: AuthProvider อ่าน token + member จาก localStorage ตอนเริ่ม
// getMe ไม่ตอบเลย เพราะ member มีอยู่แล้ว และไม่ให้มา setState ตอนเทสต์ทำอย่างอื่นอยู่ (warning act)
export function loginAs(member, token = 'tok') {
  localStorage.setItem('petfinder.token', token);
  localStorage.setItem('petfinder.member', JSON.stringify(member));
  api.getMe.mockReturnValue(new Promise(() => {}));
}

export const admin = { id: 1, email: 'admin@petfinder.test', displayName: 'แอดมิน', phone: null, role: 'admin' };
export const nida = { id: 3, email: 'nida@example.com', displayName: 'นิดา', phone: '0898765432', role: 'member' };

// บทความปลอมหน้าตาเหมือนที่ server ตอบ
export const article = (id, title, published = true) => ({
  id,
  title,
  published,
  body: `เนื้อหาของ ${title}`,
  coverUrl: null,
  author: { id: 1, displayName: 'แอดมิน', phone: null },
  createdAt: '2026-10-10T09:00:00+07:00',
  updatedAt: '2026-10-10T09:00:00+07:00',
});

// หน้ารายการแบบแบ่งหน้า { items, page, pageSize, total }
export const pageOf = (items, { page = 1, total = items.length } = {}) => ({ items, page, pageSize: 10, total });

// รอบรถปลอมหน้าตาเหมือนที่ server ตอบ (รอบ 1 ใน seed.sql: รถตู้ 13 ที่ ราคา 80)
export const trip = (id, overrides = {}) => ({
  id,
  route: { id: 1, origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 60 },
  vehicle: { id: 1, plate: '10-1234 กทม', kind: 'van', seatCount: 13 },
  departAt: '2026-10-21T07:00:00+07:00',
  arriveAt: '2026-10-21T08:00:00+07:00',
  priceBaht: 80,
  status: 'scheduled',
  departed: false,
  seatsLeft: 10,
  ...overrides,
});
