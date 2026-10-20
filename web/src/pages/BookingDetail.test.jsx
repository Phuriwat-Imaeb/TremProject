import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { loginAs, nida, renderWithProviders, trip } from '../test-utils';
import BookingDetail from './BookingDetail';

jest.mock('../api/backend');

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route path="/bookings/:id" element={<BookingDetail />} />
    </Routes>,
    { route }
  );
}

const booking = (overrides = {}) => ({
  id: 1,
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

test('หน้าตั๋วโชว์เส้นทาง เวลา ที่นั่ง และยอดรวม', async () => {
  api.getBooking.mockResolvedValue(booking());
  renderAt('/bookings/1');

  expect(await screen.findByRole('heading', { name: 'การจอง #1' })).toBeInTheDocument();
  expect(screen.getByText('จองแล้ว')).toBeInTheDocument();
  expect(screen.getByText('กรุงเทพฯ (หมอชิต) → นครปฐม')).toBeInTheDocument();
  expect(screen.getByText('1, 2')).toBeInTheDocument();
  expect(screen.getByText('160 บาท')).toBeInTheDocument();
  expect(api.getBooking).toHaveBeenCalledWith('1', 'tok');
});

test('รอบรถถูกยกเลิก ต้องเตือนบนหน้าตั๋ว', async () => {
  api.getBooking.mockResolvedValue(booking({ trip: trip(1, { status: 'cancelled' }) }));
  renderAt('/bookings/1');
  expect(await screen.findByRole('alert')).toHaveTextContent('รอบรถนี้ถูกยกเลิกแล้ว');
});

test('ของคนอื่นหรือไม่มี: โชว์ข้อความจาก server', async () => {
  api.getBooking.mockRejectedValue(new Error('ไม่พบรายการนี้'));
  renderAt('/bookings/2');
  expect(await screen.findByRole('alert')).toHaveTextContent('ไม่พบรายการนี้');
});
