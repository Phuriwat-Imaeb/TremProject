import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as api from '../../api/backend';
import { loginAs, renderWithProviders, staff, trip } from '../../test-utils';
import TripForm from './TripForm';

jest.mock('../../api/backend');

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route path="/admin/trips" element={<p>หน้ารายการรอบ</p>} />
      <Route path="/admin/trips/new" element={<TripForm />} />
      <Route path="/admin/trips/:id/edit" element={<TripForm />} />
    </Routes>,
    { route }
  );
}

// jsdom พิมพ์ทีละตัวลงช่อง datetime-local ไม่ได้ ต้องตั้งค่าทีเดียว
const setDepart = (value) => fireEvent.change(screen.getByLabelText('เวลาออก (เวลาไทย)'), { target: { value } });

// ช่องที่มีคำอธิบาย (hint) อยู่ใน <label> ชื่อช่องจึงยาวกว่าป้าย ค้นด้วย "ขึ้นต้นด้วย"
const vehicleSelect = () => screen.getByLabelText(/^คันรถ/);
const priceInput = () => screen.getByLabelText(/^ราคาต่อที่นั่ง/);

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(staff);
  api.listRoutes.mockResolvedValue({ items: [{ id: 1, origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 60 }] });
  api.staffListVehicles.mockResolvedValue({
    items: [
      { id: 1, plate: '10-1234 กทม', kind: 'van', seatCount: 13 },
      { id: 3, plate: '15-9999 กทม', kind: 'bus', seatCount: 40 },
    ],
  });
});

test('เพิ่มรอบ: เวลาที่กรอกถือเป็นเวลาไทย ส่งไปพร้อม +07:00 และราคาเป็นตัวเลข', async () => {
  api.createTrip.mockResolvedValue(trip(8));
  renderAt('/admin/trips/new');

  await userEvent.selectOptions(await screen.findByLabelText('เส้นทาง'), '1');
  await userEvent.selectOptions(vehicleSelect(), 'รถทัวร์ 15-9999 กทม (40 ที่)');
  setDepart('2026-10-25T08:30');
  await userEvent.type(priceInput(), '120');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(api.createTrip).toHaveBeenCalledWith(
    { routeId: 1, vehicleId: 3, departAt: '2026-10-25T08:30:00+07:00', priceBaht: 120 },
    'tok'
  );
  expect(await screen.findByText('หน้ารายการรอบ')).toBeInTheDocument();
});

test('แก้ไข: เติมค่าเดิมเป็นเวลาไทย ล็อกเส้นทาง/คันรถ และส่งแค่เวลากับราคา', async () => {
  api.getTrip.mockResolvedValue(trip(1));
  api.updateTrip.mockResolvedValue(trip(1));
  renderAt('/admin/trips/1/edit');

  const time = await screen.findByLabelText('เวลาออก (เวลาไทย)');
  expect(time).toHaveValue('2026-10-21T07:00');
  expect(screen.getByLabelText('เส้นทาง')).toBeDisabled();
  expect(vehicleSelect()).toBeDisabled();

  await userEvent.clear(priceInput());
  await userEvent.type(priceInput(), '90');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
  expect(api.updateTrip).toHaveBeenCalledWith('1', { departAt: '2026-10-21T07:00:00+07:00', priceBaht: 90 }, 'tok');
  expect(await screen.findByText('หน้ารายการรอบ')).toBeInTheDocument(); // รอ toast + เปลี่ยนหน้าให้เสร็จก่อนจบเทสต์
});

test('server ปฏิเสธ (รถชนรอบเดิม) โชว์เหตุผลและอยู่หน้าเดิม', async () => {
  api.createTrip.mockRejectedValue(new Error('รถคันนี้มีรอบออกเวลานี้อยู่แล้ว'));
  renderAt('/admin/trips/new');

  await userEvent.selectOptions(await screen.findByLabelText('เส้นทาง'), '1');
  await userEvent.selectOptions(vehicleSelect(), 'รถตู้ 10-1234 กทม (13 ที่)');
  setDepart('2026-10-25T08:30');
  await userEvent.type(priceInput(), '80');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('รถคันนี้มีรอบออกเวลานี้อยู่แล้ว');
  expect(screen.getByRole('button', { name: 'บันทึก' })).toBeEnabled();
});

test('รอบที่ปิดแล้วแก้ไม่ได้', async () => {
  api.getTrip.mockResolvedValue(trip(7, { departed: true }));
  renderAt('/admin/trips/7/edit');
  expect(await screen.findByRole('alert')).toHaveTextContent('แก้ไขไม่ได้');
});
