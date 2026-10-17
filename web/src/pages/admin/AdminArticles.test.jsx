import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../api/backend';
import { admin, article, loginAs, pageOf, renderWithProviders } from '../../test-utils';
import AdminArticles from './AdminArticles';

jest.mock('../../api/backend');

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  loginAs(admin);
  api.adminListArticles.mockResolvedValue(pageOf([article(1, 'เรื่องแรก'), article(2, 'ร่างที่สอง', false)]));
});

test('โชว์ทั้งที่เผยแพร่และฉบับร่าง', async () => {
  renderWithProviders(<AdminArticles />);
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByText('เรื่องแรก')).toBeInTheDocument();
  expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument();
  expect(api.adminListArticles).toHaveBeenCalledWith({ q: '', page: 1 }, 'tok');
});

test('กดลบ ต้องถามก่อน ยกเลิกแล้วไม่ลบ ยืนยันแล้วหายจากตารางพร้อมข้อความสำเร็จ', async () => {
  api.deleteArticle.mockResolvedValue(null);
  renderWithProviders(<AdminArticles />);
  const row = (await screen.findByText('ร่างที่สอง')).closest('li');

  await userEvent.click(within(row).getByRole('button', { name: 'ลบ' }));
  let dialog = screen.getByRole('dialog', { name: 'ลบบทความนี้?' });
  expect(dialog).toHaveTextContent('ร่างที่สอง');
  await userEvent.click(within(dialog).getByRole('button', { name: 'ยกเลิก' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.deleteArticle).not.toHaveBeenCalled();

  await userEvent.click(within(row).getByRole('button', { name: 'ลบ' }));
  dialog = screen.getByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'ลบ' }));

  await waitForElementToBeRemoved(() => screen.queryByText('ร่างที่สอง'));
  expect(api.deleteArticle).toHaveBeenCalledWith(2, 'tok');
  expect(screen.getByText('ลบ "ร่างที่สอง" แล้ว')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('ลบไม่สำเร็จ แถวยังอยู่ และบอกข้อความจาก server', async () => {
  api.deleteArticle.mockRejectedValue(new Error('ไม่พบรายการนี้'));
  renderWithProviders(<AdminArticles />);
  const row = (await screen.findByText('เรื่องแรก')).closest('li');
  await userEvent.click(within(row).getByRole('button', { name: 'ลบ' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ลบ' }));

  expect(await screen.findByText('ไม่พบรายการนี้')).toBeInTheDocument();
  expect(screen.getByText('เรื่องแรก')).toBeInTheDocument();
});

test('ไม่มีบทความเลย โชว์ข้อความว่างพร้อมปุ่มเขียนใหม่', async () => {
  api.adminListArticles.mockResolvedValue(pageOf([]));
  renderWithProviders(<AdminArticles />);
  expect(await screen.findByText('ยังไม่มีบทความ')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'เขียนบทความใหม่' })).toHaveLength(2);
});
