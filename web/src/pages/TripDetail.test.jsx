import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { renderWithProviders, trip } from '../test-utils';
import TripDetail from './TripDetail';

jest.mock('../api/backend');

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route path="/trips/:id" element={<TripDetail />} />
    </Routes>,
    { route }
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  api.getTripSeats.mockResolvedValue({ tripId: 1, kind: 'van', seatCount: 13, taken: [1, 2, 5] });
});

test('ผังที่นั่ง: ที่ไม่ว่างกดไม่ได้ กดที่ว่างแล้วเลือก/เลิกเลือกได้ และรวมราคาให้', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  renderAt('/trips/1');

  expect(await screen.findByRole('heading', { name: 'กรุงเทพฯ (หมอชิต) → นครปฐม' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^ที่นั่ง \d+/ })).toHaveLength(13);
  expect(screen.getByRole('button', { name: 'ที่นั่ง 5 ไม่ว่าง' })).toBeDisabled();

  const seat4 = screen.getByRole('button', { name: 'ที่นั่ง 4' });
  await userEvent.click(screen.getByRole('button', { name: 'ที่นั่ง 7' }));
  await userEvent.click(seat4);
  expect(seat4).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/ที่นั่ง 4, 7/)).toHaveTextContent('รวม 160 บาท'); // เรียงเลขให้ ไม่ใช่ตามลำดับที่กด

  await userEvent.click(seat4);
  expect(seat4).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText(/ที่นั่ง 7/)).toHaveTextContent('รวม 80 บาท');
});

test('เลือกได้ไม่เกิน 10 ที่', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  api.getTripSeats.mockResolvedValue({ tripId: 1, kind: 'van', seatCount: 13, taken: [] });
  renderAt('/trips/1');
  await screen.findByRole('group', { name: 'ผังที่นั่ง' });

  for (let no = 1; no <= 11; no++) {
    await userEvent.click(screen.getByRole('button', { name: `ที่นั่ง ${no}` }));
  }
  expect(screen.getByRole('button', { name: 'ที่นั่ง 11' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('จองได้ครั้งละไม่เกิน 10 ที่นั่ง')).toBeInTheDocument();
});

test('รอบที่ยกเลิกแล้วไม่โชว์ผังให้เลือก', async () => {
  api.getTrip.mockResolvedValue(trip(6, { status: 'cancelled' }));
  renderAt('/trips/6');
  expect(await screen.findByRole('alert')).toHaveTextContent('รอบนี้ถูกยกเลิกแล้ว');
  expect(screen.queryByRole('group', { name: 'ผังที่นั่ง' })).not.toBeInTheDocument();
});

test('ไม่พบรอบ ต้องโชว์ข้อความจาก server', async () => {
  api.getTrip.mockRejectedValue(new Error('ไม่พบรายการนี้'));
  renderAt('/trips/999');
  expect(await screen.findByRole('alert')).toHaveTextContent('ไม่พบรายการนี้');
});
