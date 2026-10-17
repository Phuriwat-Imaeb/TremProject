import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as api from './api/backend';
import App from './App';
import { AuthProvider } from './auth/AuthContext';

jest.mock('./api/backend');

const nida = { id: 3, email: 'nida@example.com', displayName: 'นิดา', role: 'member' };

function renderApp(path) {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

test('URL ที่ไม่มีอยู่ ต้องเจอหน้า 404 และตั้งชื่อแท็บ', () => {
  renderApp('/no-such-page');
  expect(screen.getByRole('heading', { name: 'ไม่พบหน้านี้' })).toBeInTheDocument();
  expect(document.title).toBe('ไม่พบหน้านี้ · PetFinder');
  expect(screen.getByRole('link', { name: 'กลับหน้าแรก' })).toHaveAttribute('href', '/');
});

test('ตั๋วหมดอายุระหว่างใช้งาน ต้องพาไปหน้า login พร้อมบอกเหตุผล แล้ว login ใหม่กลับมาหน้าเดิม', async () => {
  localStorage.setItem('petfinder.token', 'old');
  localStorage.setItem('petfinder.member', JSON.stringify(nida));
  api.getMe.mockReturnValue(new Promise(() => {})); // ไม่ให้มาแทรกจังหวะเทสต์
  renderApp('/me');
  expect(screen.getByRole('heading', { name: 'บัญชีของฉัน' })).toBeInTheDocument();

  // จำลองว่าคำขอสักอันได้ 401: เรียกตัวจัดการที่ AuthProvider ฝากไว้กับ backend.js
  const onUnauthorized = api.setUnauthorizedHandler.mock.calls[0][0];
  act(() => onUnauthorized());

  expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('หมดเวลาเข้าสู่ระบบ');
  expect(localStorage.getItem('petfinder.token')).toBeNull();

  api.login.mockResolvedValue({ token: 'new', member: nida });
  await userEvent.type(screen.getByLabelText('อีเมล'), 'nida@example.com');
  await userEvent.type(screen.getByLabelText('รหัสผ่าน'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('heading', { name: 'บัญชีของฉัน' })).toBeInTheDocument();
});

test('เมนูมือถือ กดเปิดแล้วเห็นลิงก์ กดลิงก์แล้วเมนูหุบ', async () => {
  renderApp('/');
  const toggle = screen.getByRole('button', { name: 'เปิดเมนู' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = document.getElementById('mobile-menu');
  expect(menu).toBeInTheDocument();

  api.listArticles.mockReturnValue(new Promise(() => {}));
  await userEvent.click(within(menu).getByRole('link', { name: 'บทความ' }));
  expect(document.getElementById('mobile-menu')).not.toBeInTheDocument();
});
