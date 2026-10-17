import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { nida, renderWithProviders } from '../test-utils';
import Register from './Register';

jest.mock('../api/backend');

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<p>หน้าแรก</p>} />
    </Routes>,
    { route: '/register' }
  );
}

async function fill({ password = 'password123', confirm = password } = {}) {
  await userEvent.type(screen.getByLabelText('อีเมล'), 'nida@example.com');
  await userEvent.type(screen.getByLabelText('ชื่อที่แสดง'), 'นิดา');
  await userEvent.type(screen.getByLabelText(/^รหัสผ่าน/), password);
  await userEvent.type(screen.getByLabelText('ยืนยันรหัสผ่าน'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
}

test('รหัสผ่านสองช่องไม่ตรงกัน บอกทันทีโดยไม่ส่งไป server', async () => {
  renderPage();
  await fill({ confirm: 'password999' });
  expect(screen.getByRole('alert')).toHaveTextContent('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  expect(api.register).not.toHaveBeenCalled();
});

test('สมัครสำเร็จ ส่งข้อมูลโดยไม่มีช่องยืนยัน แล้ว login ให้เลย', async () => {
  api.register.mockResolvedValue(nida);
  api.login.mockResolvedValue({ token: 'tok', member: nida });
  api.getMe.mockReturnValue(new Promise(() => {}));
  renderPage();
  await fill();

  expect(await screen.findByText('หน้าแรก')).toBeInTheDocument();
  expect(api.register).toHaveBeenCalledWith({
    email: 'nida@example.com',
    password: 'password123',
    displayName: 'นิดา',
    phone: '',
  });
  expect(localStorage.getItem('petfinder.token')).toBe('tok');
});

test('อีเมลซ้ำ โชว์ข้อความจาก server และกดสมัครใหม่ได้', async () => {
  api.register.mockRejectedValue(Object.assign(new Error('อีเมลนี้มีบัญชีอยู่แล้ว'), { status: 409 }));
  renderPage();
  await fill();
  expect(await screen.findByRole('alert')).toHaveTextContent('อีเมลนี้มีบัญชีอยู่แล้ว');
  expect(screen.getByRole('button', { name: 'สมัครสมาชิก' })).toBeEnabled();
});
