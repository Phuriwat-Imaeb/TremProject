import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as api from '../../api/backend';
import { loginAs, pageOf, renderWithProviders, staff, trip } from '../../test-utils';
import AdminTrips from './AdminTrips';

jest.mock('../../api/backend');

function ShowURL() {
  const { search } = useLocation();
  return <p data-testid="url">{search}</p>;
}

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route
        path="/admin/trips"
        element={
          <>
            <AdminTrips />
            <ShowURL />
          </>
        }
      />
    </Routes>,
    { route }
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(staff);
  api.listRoutes.mockResolvedValue({ items: [{ id: 1, origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 60 }] });
});

test('รอบที่เปิดขายมีปุ่มแก้ไข/ยกเลิก รอบที่ปิดแล้วมีแค่ดูผู้โดยสาร', async () => {
  api.staffListTrips.mockResolvedValue(
    pageOf([trip(1), trip(6, { status: 'cancelled', seatsLeft: 13 }), trip(7, { departed: true, seatsLeft: 12 })])
  );
  renderAt('/admin/trips');

  const rows = await screen.findAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('เปิดขาย');
  expect(rows[0]).toHaveTextContent('จองแล้ว 3/13 ที่');
  expect(within(rows[0]).getByRole('link', { name: 'แก้ไข' })).toHaveAttribute('href', '/admin/trips/1/edit');
  expect(within(rows[0]).getByRole('button', { name: 'ยกเลิกรอบ' })).toBeInTheDocument();

  expect(rows[1]).toHaveTextContent('ยกเลิกแล้ว');
  expect(rows[2]).toHaveTextContent('ออกไปแล้ว');
  for (const row of [rows[1], rows[2]]) {
    expect(within(row).queryByRole('link', { name: 'แก้ไข' })).not.toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'ผู้โดยสาร' })).toBeInTheDocument();
  }
  expect(api.staffListTrips).toHaveBeenCalledWith({ routeId: '', date: '', page: 1 }, 'tok');
});

test('ยกเลิกรอบ: ถามยืนยันพร้อมบอกจำนวนที่นั่งที่จะถูกยกเลิก แล้วอัปเดตแถวนั้น', async () => {
  api.staffListTrips.mockResolvedValue(pageOf([trip(1)]));
  api.cancelTrip.mockResolvedValue(trip(1, { status: 'cancelled', seatsLeft: 13 }));
  renderAt('/admin/trips');

  await userEvent.click(await screen.findByRole('button', { name: 'ยกเลิกรอบ' }));
  const dialog = screen.getByRole('dialog', { name: 'ยกเลิกรอบรถนี้?' });
  expect(dialog).toHaveTextContent('การจอง 3 ที่นั่งจะถูกยกเลิกทั้งหมด');
  await userEvent.click(within(dialog).getByRole('button', { name: 'ยกเลิกรอบ' }));

  expect(api.cancelTrip).toHaveBeenCalledWith(1, 'tok');
  expect(await screen.findByText('ยกเลิกแล้ว')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'ยกเลิกรอบ' })).not.toBeInTheDocument();
});

test('กรองเส้นทางและวัน ย้อนดูวันที่ผ่านมาแล้วได้ ตัวกรองไปอยู่ใน URL', async () => {
  api.staffListTrips.mockResolvedValue(pageOf([]));
  renderAt('/admin/trips?page=2');
  await screen.findByText('ไม่มีรอบรถที่ตรงกับที่เลือก');
  await screen.findByRole('option', { name: 'กรุงเทพฯ (หมอชิต) → นครปฐม' });

  expect(screen.getByLabelText('วันเดินทาง')).not.toHaveAttribute('min');
  await userEvent.selectOptions(screen.getByLabelText('เส้นทาง'), '1');
  await userEvent.type(screen.getByLabelText('วันเดินทาง'), '2026-10-01');
  await act(async () => userEvent.click(screen.getByRole('button', { name: 'ค้นหา' })));

  expect(screen.getByTestId('url')).toHaveTextContent('?routeId=1&date=2026-10-01'); // ค้นใหม่กลับไปหน้า 1
  expect(api.staffListTrips).toHaveBeenLastCalledWith({ routeId: '1', date: '2026-10-01', page: 1 }, 'tok');
});
