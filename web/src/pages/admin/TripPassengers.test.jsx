import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import * as api from '../../api/backend';
import { loginAs, renderWithProviders, staff, trip } from '../../test-utils';
import TripPassengers from './TripPassengers';

jest.mock('../../api/backend');

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route path="/admin/trips/:id/passengers" element={<TripPassengers />} />
    </Routes>,
    { route }
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(staff);
});

test('ตารางผู้โดยสาร: ที่นั่ง ชื่อ เบอร์ และนับที่นั่งที่จองแล้ว', async () => {
  api.tripPassengers.mockResolvedValue({
    trip: trip(1),
    items: [
      { bookingId: 1, member: { id: 3, displayName: 'นิดา', phone: '0898765432' }, seats: [1, 2], totalBaht: 160, createdAt: '2026-10-20T10:00:00+07:00' },
      { bookingId: 2, member: { id: 4, displayName: 'ต้น', phone: null }, seats: [5], totalBaht: 80, createdAt: '2026-10-20T10:05:00+07:00' },
    ],
  });
  renderAt('/admin/trips/1/passengers');

  const rows = await screen.findAllByRole('row');
  expect(rows).toHaveLength(3); // หัวตาราง + 2 แถว
  expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['1, 2', 'นิดา', '0898765432', '#1', '160 บาท']);
  expect(within(rows[2]).getAllByRole('cell')[2]).toHaveTextContent('-');
  expect(screen.getByText(/จองแล้ว 3\/13 ที่/)).toBeInTheDocument();
  expect(api.tripPassengers).toHaveBeenCalledWith('1', 'tok');
});

test('ยังไม่มีคนจอง', async () => {
  api.tripPassengers.mockResolvedValue({ trip: trip(2, { seatsLeft: 13 }), items: [] });
  renderAt('/admin/trips/2/passengers');
  expect(await screen.findByText('ยังไม่มีผู้โดยสาร')).toBeInTheDocument();
});
