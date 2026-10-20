import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { loginAs, nida, pageOf, renderWithProviders, trip } from '../test-utils';
import MyBookings from './MyBookings';

jest.mock('../api/backend');

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route path="/bookings" element={<MyBookings />} />
    </Routes>,
    { route }
  );
}

const booking = (id, overrides = {}) => ({
  id,
  trip: trip(1),
  seats: [1, 2],
  totalBaht: 160,
  status: 'confirmed',
  cancelledAt: null,
  createdAt: '2026-10-20T10:00:00+07:00',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(nida);
});

test('รายการการจอง: ลิงก์ไปหน้าตั๋ว และป้ายสถานะตามสภาพจริง', async () => {
  api.listMyBookings.mockResolvedValue(
    pageOf([
      booking(1),
      booking(3, { status: 'cancelled', cancelledAt: '2026-10-20T11:00:00+07:00', seats: [12] }),
      booking(4, { trip: trip(7, { departed: true }) }),
      booking(5, { trip: trip(6, { status: 'cancelled' }) }),
    ])
  );
  renderAt('/bookings');

  const first = await screen.findByRole('link', { name: /การจอง #1/ });
  expect(first).toHaveAttribute('href', '/bookings/1');
  expect(first).toHaveTextContent('ที่นั่ง 1, 2 · 160 บาท');
  expect(first).toHaveTextContent('จองแล้ว');
  expect(screen.getByRole('link', { name: /การจอง #3/ })).toHaveTextContent('ยกเลิกแล้ว');
  expect(screen.getByRole('link', { name: /การจอง #4/ })).toHaveTextContent('เดินทางแล้ว');
  expect(screen.getByRole('link', { name: /การจอง #5/ })).toHaveTextContent('รอบรถถูกยกเลิก');
  expect(api.listMyBookings).toHaveBeenCalledWith({ page: 1 }, 'tok');
});

test('ยังไม่เคยจอง', async () => {
  api.listMyBookings.mockResolvedValue(pageOf([]));
  renderAt('/bookings');
  expect(await screen.findByText('ยังไม่มีการจอง')).toBeInTheDocument();
});

test('อ่าน ?page= จาก URL', async () => {
  api.listMyBookings.mockResolvedValue(pageOf([booking(1)], { page: 2, total: 11 }));
  renderAt('/bookings?page=2');
  expect(await screen.findByText('หน้า 2 จาก 2')).toBeInTheDocument();
  expect(api.listMyBookings).toHaveBeenCalledWith({ page: 2 }, 'tok');
});
