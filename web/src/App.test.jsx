import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from './api/backend';
import App from './App';
import { admin, loginAs, nida, pageOf, renderWithProviders } from './test-utils';

jest.mock('./api/backend');

const renderApp = (route) => renderWithProviders(<App />, { route });

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
  loginAs(nida, 'old');
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

test('ลิงก์หลังบ้านเห็นเฉพาะ admin', () => {
  loginAs(nida);
  const { unmount } = renderApp('/');
  expect(screen.queryByRole('link', { name: 'หลังบ้าน' })).not.toBeInTheDocument();
  unmount();

  loginAs(admin);
  renderApp('/');
  expect(screen.getByRole('link', { name: 'หลังบ้าน' })).toHaveAttribute('href', '/admin');
});

test('เข้า /admin เฉย ๆ พาไปแท็บบทความ และสลับไปแท็บสมาชิกได้', async () => {
  loginAs(admin);
  api.adminListArticles.mockResolvedValue(pageOf([]));
  api.adminListMembers.mockResolvedValue({ items: [admin, nida] });
  renderApp('/admin');

  expect(await screen.findByRole('heading', { name: 'จัดการบทความ' })).toBeInTheDocument();
  const tabs = screen.getByRole('navigation', { name: 'เมนูหลังบ้าน' });
  await act(async () => userEvent.click(within(tabs).getByRole('link', { name: 'สมาชิก' })));
  expect(await screen.findByRole('heading', { name: 'จัดการสมาชิก' })).toBeInTheDocument();
});
