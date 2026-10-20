import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { AuthProvider } from '../auth/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from './Login';

jest.mock('../api/backend');

beforeEach(() => localStorage.clear()); // AuthProvider อ่าน token จาก localStorage ตอนเริ่ม

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <p>หน้าบัญชี</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

test('ยังไม่ login เข้า /me ต้องเด้งไปหน้า login แล้ว login เสร็จกลับมาที่ /me', async () => {
  const member = { id: 3, email: 'nida@example.com', displayName: 'นิดา', role: 'member' };
  api.login.mockResolvedValue({ token: 'tok', member });
  api.getMe.mockResolvedValue(member);

  renderAt('/me');
  await userEvent.type(screen.getByLabelText('อีเมล'), 'nida@example.com');
  await userEvent.type(screen.getByLabelText('รหัสผ่าน'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));

  expect(await screen.findByText('หน้าบัญชี')).toBeInTheDocument();
  expect(api.login).toHaveBeenCalledWith('nida@example.com', 'password123');
  expect(localStorage.getItem('jongkookhub.token')).toBe('tok');
});

test('รหัสผิดต้องโชว์ข้อความจาก server และปุ่มกดได้อีก', async () => {
  api.login.mockRejectedValue(Object.assign(new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'), { status: 401 }));

  renderAt('/login');
  await userEvent.type(screen.getByLabelText('อีเมล'), 'nida@example.com');
  await userEvent.type(screen.getByLabelText('รหัสผ่าน'), 'wrong-pass');
  await userEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeEnabled();
});
