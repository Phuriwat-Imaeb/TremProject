import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../api/backend';
import { AuthProvider } from '../auth/AuthContext';
import Profile from './Profile';

jest.mock('../api/backend');

const member = { id: 3, email: 'nida@example.com', displayName: 'นิดา', phone: null, role: 'member' };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('jongkookhub.token', 'tok');
  localStorage.setItem('jongkookhub.member', JSON.stringify(member));
  api.getMe.mockResolvedValue(member);
});

// ห่อด้วย act แบบ async ให้ AuthProvider ถาม getMe ตอนเริ่มจนเสร็จก่อน จะได้ไม่เตือนเรื่อง state เปลี่ยนนอก act
async function renderPage() {
  await act(async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </MemoryRouter>
    );
  });
}

async function fill(current, next, confirm = next) {
  await userEvent.type(screen.getByLabelText('รหัสผ่านเดิม'), current);
  await userEvent.type(screen.getByLabelText(/^รหัสผ่านใหม่/), next); // ป้ายมี hint ต่อท้าย
  await userEvent.type(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }));
}

test('เปลี่ยนรหัสสำเร็จ ต้องส่งรหัสเดิม รหัสใหม่ และ token แล้วล้างช่องกรอก', async () => {
  api.changePassword.mockResolvedValue(null);
  await renderPage();

  await fill('oldpass123', 'newpass456');

  expect(await screen.findByText(/เปลี่ยนรหัสผ่านแล้ว/)).toBeInTheDocument();
  expect(api.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass456', 'tok');
  expect(screen.getByLabelText('รหัสผ่านเดิม')).toHaveValue('');
});

test('รหัสใหม่สองช่องไม่ตรงกัน ต้องเตือนโดยไม่ยิง server', async () => {
  await renderPage();

  await fill('oldpass123', 'newpass456', 'newpass999');

  expect(screen.getByRole('alert')).toHaveTextContent('ไม่ตรงกัน');
  expect(api.changePassword).not.toHaveBeenCalled();
});

test('รหัสเดิมผิด ต้องโชว์ข้อความจาก server และยังอยู่ในระบบ', async () => {
  api.changePassword.mockRejectedValue(Object.assign(new Error('รหัสผ่านเดิมไม่ถูกต้อง'), { status: 400 }));
  await renderPage();

  await fill('wrongpass1', 'newpass456');

  expect(await screen.findByRole('alert')).toHaveTextContent('รหัสผ่านเดิมไม่ถูกต้อง');
  expect(localStorage.getItem('jongkookhub.token')).toBe('tok');
  expect(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' })).toBeEnabled();
});
