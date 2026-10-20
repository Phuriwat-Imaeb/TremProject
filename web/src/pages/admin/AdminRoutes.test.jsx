import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../api/backend';
import { admin, loginAs, renderWithProviders } from '../../test-utils';
import AdminRoutes from './AdminRoutes';

jest.mock('../../api/backend');

const route = { id: 1, origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 60 };

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(admin);
  api.listRoutes.mockResolvedValue({ items: [route] });
});

test('แก้เส้นทาง: กดแก้ไขแล้วฟอร์มเติมค่าเดิม บันทึกแล้วแถวในรายการเปลี่ยนตาม', async () => {
  api.updateRoute.mockResolvedValue({ ...route, durationMin: 75 });
  renderWithProviders(<AdminRoutes />);

  await userEvent.click(await screen.findByRole('button', { name: 'แก้ไข' }));
  expect(screen.getByLabelText('ต้นทาง')).toHaveValue('กรุงเทพฯ (หมอชิต)');
  const minutes = screen.getByLabelText('เวลาเดินทาง (นาที)');
  await userEvent.clear(minutes);
  await userEvent.type(minutes, '75');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(api.updateRoute).toHaveBeenCalledWith(1, { origin: 'กรุงเทพฯ (หมอชิต)', destination: 'นครปฐม', durationMin: 75 }, 'tok');
  expect(await screen.findByText('ประมาณ 75 นาที')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'เพิ่มเส้นทาง' })).toBeInTheDocument(); // ฟอร์มกลับเป็นโหมดเพิ่ม
});

test('ลบเส้นทางที่ยังไม่มีรอบ: ถามยืนยัน แล้วเอาออกจากรายการ', async () => {
  api.deleteRoute.mockResolvedValue(null);
  renderWithProviders(<AdminRoutes />);

  await userEvent.click(await screen.findByRole('button', { name: 'ลบ' }));
  const dialog = screen.getByRole('dialog', { name: 'ลบเส้นทางนี้?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'ลบ' }));

  expect(api.deleteRoute).toHaveBeenCalledWith(1, 'tok');
  expect(await screen.findByText('ยังไม่มีเส้นทาง')).toBeInTheDocument();
});
