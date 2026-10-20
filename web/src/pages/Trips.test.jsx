import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as api from '../api/backend';
import { renderWithProviders, trip } from '../test-utils';
import Trips from './Trips';

jest.mock('../api/backend');

function ShowURL() {
  const { search } = useLocation();
  return <p data-testid="url">{search}</p>;
}

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route
        path="/trips"
        element={
          <>
            <Trips />
            <ShowURL />
          </>
        }
      />
    </Routes>,
    { route }
  );
}

const routes = {
  items: [
    { id: 1, origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 60 },
    { id: 3, origin: 'กรุงเทพฯ (สายใต้)', destination: 'หัวหิน', durationMin: 180 },
  ],
};

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  api.listRoutes.mockResolvedValue(routes);
});

test('โชว์รอบรถพร้อมเวลา ราคา ที่ว่าง และลิงก์ไปหน้าเลือกที่นั่ง', async () => {
  api.listTrips.mockResolvedValue({ items: [trip(1), trip(2, { seatsLeft: 0, departAt: '2026-10-21T09:00:00+07:00' })] });
  renderAt('/trips');

  const first = await screen.findByRole('link', { name: /07:00 → 08:00/ });
  expect(first).toHaveAttribute('href', '/trips/1');
  expect(first).toHaveTextContent('80 บาท');
  expect(first).toHaveTextContent('ว่าง 10 ที่');
  expect(first).toHaveTextContent('รถตู้');
  expect(screen.getByRole('link', { name: /09:00/ })).toHaveTextContent('เต็มแล้ว');
  expect(api.listTrips).toHaveBeenCalledWith({ routeId: '', date: '' });
});

test('เลือกเส้นทางและวันแล้วค้นหา ตัวกรองไปอยู่ใน URL และโหลดใหม่ตามนั้น', async () => {
  api.listTrips.mockResolvedValue({ items: [] });
  renderAt('/trips');
  await screen.findByText('ยังไม่มีรอบรถที่เปิดขาย');
  await screen.findByRole('option', { name: 'กรุงเทพฯ (สายใต้) → หัวหิน' });

  await userEvent.selectOptions(screen.getByLabelText('เส้นทาง'), '3');
  await userEvent.type(screen.getByLabelText('วันเดินทาง'), '2026-10-22');
  await act(async () => userEvent.click(screen.getByRole('button', { name: 'ค้นหา' })));

  expect(screen.getByTestId('url')).toHaveTextContent('?routeId=3&date=2026-10-22');
  expect(api.listTrips).toHaveBeenLastCalledWith({ routeId: '3', date: '2026-10-22' });
  expect(await screen.findByText(/ไม่มีรอบรถที่ตรงกับที่เลือก/)).toBeInTheDocument();
});

test('server ตอบ error ต้องโชว์ข้อความ', async () => {
  api.listTrips.mockRejectedValue(new Error('date ต้องเป็นรูปแบบ YYYY-MM-DD'));
  renderAt('/trips?date=oops');
  expect(await screen.findByRole('alert')).toHaveTextContent('date ต้องเป็นรูปแบบ');
});
