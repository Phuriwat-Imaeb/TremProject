import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as api from '../api/backend';
import { loginAs, nida, renderWithProviders, trip } from '../test-utils';
import TripDetail from './TripDetail';

jest.mock('../api/backend');

function renderAt(route) {
  return renderWithProviders(
    <Routes>
      <Route path="/trips/:id" element={<TripDetail />} />
      <Route path="/bookings/:id" element={<p>หน้าตั๋ว</p>} />
      <Route path="/login" element={<p>หน้า login</p>} />
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

test('ยังไม่เข้าสู่ระบบ: ปุ่มจองเป็นลิงก์ไปหน้า login', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  renderAt('/trips/1');
  await userEvent.click(await screen.findByRole('link', { name: 'เข้าสู่ระบบเพื่อจอง' }));
  expect(screen.getByText('หน้า login')).toBeInTheDocument();
});

test('จองสำเร็จ: ส่งรอบ + ที่นั่งไป แล้วพาไปหน้าตั๋ว', async () => {
  loginAs(nida);
  api.getTrip.mockResolvedValue(trip(1));
  api.createBooking.mockResolvedValue({ id: 9, seats: [3, 4] });
  renderAt('/trips/1');

  const bookBtn = await screen.findByRole('button', { name: 'จองที่นั่ง' });
  expect(bookBtn).toBeDisabled(); // ยังไม่เลือก กดไม่ได้
  await userEvent.click(screen.getByRole('button', { name: 'ที่นั่ง 4' }));
  await userEvent.click(screen.getByRole('button', { name: 'ที่นั่ง 3' }));
  await userEvent.click(screen.getByRole('button', { name: 'จอง 2 ที่นั่ง' }));

  expect(api.createBooking).toHaveBeenCalledWith({ tripId: 1, seats: [3, 4] }, 'tok');
  expect(await screen.findByText('หน้าตั๋ว')).toBeInTheDocument();
  expect(screen.getByText('จองสำเร็จ ที่นั่ง 3, 4')).toBeInTheDocument();
});

test('มีคนจองตัดหน้า: บอกเหตุผล โหลดผังใหม่ และตัดที่นั่งนั้นออกจากที่เลือก', async () => {
  loginAs(nida);
  api.getTrip.mockResolvedValue(trip(1));
  api.getTripSeats
    .mockResolvedValueOnce({ tripId: 1, kind: 'van', seatCount: 13, taken: [1, 2, 5] })
    .mockResolvedValueOnce({ tripId: 1, kind: 'van', seatCount: 13, taken: [1, 2, 4, 5] });
  api.createBooking.mockRejectedValue(Object.assign(new Error('ที่นั่ง 4 มีคนจองแล้ว'), { code: 'SEAT_TAKEN' }));
  renderAt('/trips/1');

  await userEvent.click(await screen.findByRole('button', { name: 'ที่นั่ง 3' }));
  await userEvent.click(screen.getByRole('button', { name: 'ที่นั่ง 4' }));
  await userEvent.click(screen.getByRole('button', { name: 'จอง 2 ที่นั่ง' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('ที่นั่ง 4 มีคนจองแล้ว');
  expect(await screen.findByRole('button', { name: 'ที่นั่ง 4 ไม่ว่าง' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'จอง 1 ที่นั่ง' })).toBeEnabled();
  expect(api.getTripSeats).toHaveBeenCalledTimes(2);
});

// ---------- ผังที่นั่งแบบสด (WebSocket ปลอมจาก setupTests.js) ----------
// ข้อความจาก WebSocket มาเข้านอกจังหวะที่ React รู้ ต้องห่อด้วย act ให้ React วาดใหม่ให้เสร็จก่อนเช็ก
const socket = () => global.WebSocket.last();
const push = (msg) => act(() => socket().receive(msg));
const seatsMsg = (taken) => ({ type: 'seats', tripId: 1, kind: 'van', seatCount: 13, taken });

test('สด: ต่อ WebSocket ของรอบนี้ แล้ววาดผังใหม่ทุกครั้งที่ได้ข้อความ', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  api.liveSeatsURL.mockImplementation((id) => `ws://test/api/trips/${id}/live`);
  renderAt('/trips/1');
  await screen.findByRole('group', { name: 'ผังที่นั่ง' });

  expect(socket().url).toBe('ws://test/api/trips/1/live');
  expect(screen.queryByText('อัปเดตสด')).not.toBeInTheDocument();
  act(() => socket().open());
  expect(screen.getByText('อัปเดตสด')).toBeInTheDocument();

  push(seatsMsg([1, 2, 5, 7]));
  expect(screen.getByRole('button', { name: 'ที่นั่ง 7 ไม่ว่าง' })).toBeDisabled();
  expect(screen.getByText(/ว่าง 9 จาก/)).toBeInTheDocument();

  push(seatsMsg([1, 2])); // มีคนยกเลิก ที่นั่ง 5 กับ 7 กลับมาว่าง
  expect(screen.getByRole('button', { name: 'ที่นั่ง 5' })).toBeEnabled();
});

test('สด: ที่นั่งที่เราเลือกไว้ถูกคนอื่นจองไป → ตัดออกจากที่เลือก และเตือน', async () => {
  loginAs(nida);
  api.getTrip.mockResolvedValue(trip(1));
  renderAt('/trips/1');

  await userEvent.click(await screen.findByRole('button', { name: 'ที่นั่ง 4' }));
  await userEvent.click(screen.getByRole('button', { name: 'ที่นั่ง 6' }));
  push(seatsMsg([1, 2, 4, 5]));

  expect(screen.getByText('ที่นั่ง 4 เพิ่งถูกคนอื่นจองไป เลือกที่อื่นแทนได้')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ที่นั่ง 4 ไม่ว่าง' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'จอง 1 ที่นั่ง' })).toBeEnabled(); // เหลือที่ 6
});

test('สด: รอบถูกยกเลิกระหว่างเปิดหน้า → โหลดสถานะใหม่และซ่อนผัง', async () => {
  api.getTrip.mockResolvedValueOnce(trip(1)).mockResolvedValueOnce(trip(1, { status: 'cancelled' }));
  renderAt('/trips/1');
  await screen.findByRole('group', { name: 'ผังที่นั่ง' });

  push({ type: 'closed', tripId: 1 });
  expect(await screen.findByRole('alert')).toHaveTextContent('รอบนี้ถูกยกเลิกแล้ว');
  expect(screen.queryByRole('group', { name: 'ผังที่นั่ง' })).not.toBeInTheDocument();
});

test('สด: ออกจากหน้าแล้วปิดการเชื่อมต่อ', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  const { unmount } = renderAt('/trips/1');
  await screen.findByRole('group', { name: 'ผังที่นั่ง' });
  const ws = socket();
  unmount();
  expect(ws.closed).toBe(true);
});
