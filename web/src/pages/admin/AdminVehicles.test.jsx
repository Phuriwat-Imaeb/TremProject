import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../api/backend';
import { admin, loginAs, renderWithProviders } from '../../test-utils';
import AdminVehicles from './AdminVehicles';

jest.mock('../../api/backend');

const van = { id: 1, plate: '10-1234 กทม', kind: 'van', seatCount: 13 };

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(admin);
  api.staffListVehicles.mockResolvedValue({ items: [van] });
});

test('เพิ่มคันรถ: ส่งจำนวนที่นั่งเป็นตัวเลข แล้วต่อท้ายรายการ', async () => {
  api.createVehicle.mockResolvedValue({ id: 4, plate: '20-0001 นฐ', kind: 'bus', seatCount: 40 });
  renderWithProviders(<AdminVehicles />);
  await screen.findByText('10-1234 กทม');

  await userEvent.type(screen.getByLabelText('ทะเบียนรถ'), '20-0001 นฐ');
  await userEvent.selectOptions(screen.getByLabelText('ประเภท'), 'bus');
  await userEvent.type(screen.getByLabelText('จำนวนที่นั่ง'), '40');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(api.createVehicle).toHaveBeenCalledWith({ plate: '20-0001 นฐ', kind: 'bus', seatCount: 40 }, 'tok');
  expect(await screen.findByText('20-0001 นฐ')).toBeInTheDocument();
  expect(screen.getByText('รถทัวร์ · 40 ที่นั่ง')).toBeInTheDocument();
  expect(screen.getByLabelText('ทะเบียนรถ')).toHaveValue(''); // ฟอร์มเริ่มใหม่ พร้อมเพิ่มคันต่อไป
});

test('แก้คันรถ: เติมค่าเดิม ถ้า server ไม่ยอม (ที่นั่งมีคนจอง) โชว์เหตุผลในฟอร์ม', async () => {
  api.updateVehicle.mockRejectedValue(new Error('มีคนจองที่นั่งเลข 12 ในรอบที่ยังไม่ออก ลดจำนวนที่นั่งไม่ได้'));
  renderWithProviders(<AdminVehicles />);

  await userEvent.click(await screen.findByRole('button', { name: 'แก้ไข' }));
  expect(screen.getByRole('heading', { name: 'แก้คันรถ #1' })).toBeInTheDocument();
  const seats = screen.getByLabelText('จำนวนที่นั่ง');
  expect(seats).toHaveValue(13);

  await userEvent.clear(seats);
  await userEvent.type(seats, '10');
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(api.updateVehicle).toHaveBeenCalledWith(1, { plate: '10-1234 กทม', kind: 'van', seatCount: 10 }, 'tok');
  expect(await screen.findByRole('alert')).toHaveTextContent('ลดจำนวนที่นั่งไม่ได้');
  expect(screen.getByText('รถตู้ · 13 ที่นั่ง')).toBeInTheDocument(); // รายการยังเป็นค่าเดิม
});

test('ลบไม่ได้เพราะมีรอบรถใช้อยู่: แจ้งเหตุผลและแถวยังอยู่', async () => {
  api.deleteVehicle.mockRejectedValue(new Error('มีรอบรถใช้รายการนี้อยู่ ลบไม่ได้'));
  renderWithProviders(<AdminVehicles />);

  await userEvent.click(await screen.findByRole('button', { name: 'ลบ' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ลบ' }));

  expect(await screen.findByText('มีรอบรถใช้รายการนี้อยู่ ลบไม่ได้')).toBeInTheDocument();
  expect(screen.getByText('10-1234 กทม')).toBeInTheDocument();
});
