import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../api/backend';
import { admin, loginAs, nida, renderWithProviders } from '../../test-utils';
import AdminMembers from './AdminMembers';

jest.mock('../../api/backend');

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(admin);
  api.adminListMembers.mockResolvedValue({ items: [admin, nida] });
});

test('แถวของตัวเองเปลี่ยนบทบาทไม่ได้', async () => {
  renderWithProviders(<AdminMembers />);
  expect(await screen.findByRole('combobox', { name: 'บทบาทของ แอดมิน' })).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'บทบาทของ นิดา' })).toBeEnabled();
  expect(screen.getByText('(คุณ)')).toBeInTheDocument();
});

test('เลือกบทบาทใหม่ ต้องถามยืนยันก่อน แล้วอัปเดตแถวพร้อมข้อความสำเร็จ', async () => {
  api.setMemberRole.mockResolvedValue({ ...nida, role: 'rescuer' });
  renderWithProviders(<AdminMembers />);
  const select = await screen.findByRole('combobox', { name: 'บทบาทของ นิดา' });

  await userEvent.selectOptions(select, 'rescuer');
  const dialog = screen.getByRole('dialog', { name: 'เปลี่ยนบทบาท?' });
  expect(dialog).toHaveTextContent('สมาชิก → ผู้ช่วยเหลือสัตว์');
  expect(api.setMemberRole).not.toHaveBeenCalled();
  expect(select).toHaveValue('member'); // ยังไม่ยืนยัน ค่าในดรอปดาวน์ยังเป็นของเดิม

  await userEvent.click(within(dialog).getByRole('button', { name: 'เปลี่ยน' }));
  expect(await screen.findByText(/นิดา เป็นผู้ช่วยเหลือสัตว์แล้ว/)).toBeInTheDocument();
  expect(api.setMemberRole).toHaveBeenCalledWith(3, 'rescuer', 'tok');
  expect(select).toHaveValue('rescuer');
});

test('server ไม่ยอม (เช่น 409) บทบาทในดรอปดาวน์คงเดิม และบอกเหตุผล', async () => {
  api.setMemberRole.mockRejectedValue(Object.assign(new Error('เปลี่ยนบทบาทของตัวเองไม่ได้'), { status: 409 }));
  renderWithProviders(<AdminMembers />);
  const select = await screen.findByRole('combobox', { name: 'บทบาทของ นิดา' });

  await userEvent.selectOptions(select, 'admin');
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'เปลี่ยน' }));
  expect(await screen.findByText('เปลี่ยนบทบาทของตัวเองไม่ได้')).toBeInTheDocument();
  expect(select).toHaveValue('member');
});
