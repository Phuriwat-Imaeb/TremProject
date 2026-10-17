import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../../api/backend';
import { AuthProvider } from '../../auth/AuthContext';
import AdminArticles from './AdminArticles';

jest.mock('../../api/backend');

const article = (id, title, published) => ({
  id,
  title,
  published,
  body: '...',
  coverUrl: null,
  author: { id: 1, displayName: 'แอดมิน', phone: null },
  createdAt: '2026-10-10T09:00:00+07:00',
  updatedAt: '2026-10-10T09:00:00+07:00',
});

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  localStorage.setItem('petfinder.token', 'tok');
  localStorage.setItem('petfinder.member', JSON.stringify({ id: 1, displayName: 'แอดมิน', role: 'admin' }));
  api.getMe.mockReturnValue(new Promise(() => {}));
  api.adminListArticles.mockResolvedValue({ items: [article(1, 'เรื่องแรก', true), article(2, 'ร่างที่สอง', false)] });
});

function renderPage() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AdminArticles />
      </AuthProvider>
    </MemoryRouter>
  );
}

test('โชว์ทั้งที่เผยแพร่และฉบับร่าง', async () => {
  renderPage();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByText('เรื่องแรก')).toBeInTheDocument();
  expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument();
});

test('กดลบ ต้องถามก่อน ยกเลิกแล้วไม่ลบ ยืนยันแล้วหายจากตาราง', async () => {
  api.deleteArticle.mockResolvedValue(null);
  renderPage();
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
  expect(screen.getByText('เรื่องแรก')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('ไม่มีบทความเลย โชว์ข้อความว่างพร้อมปุ่มเขียนใหม่', async () => {
  api.adminListArticles.mockResolvedValue({ items: [] });
  renderPage();
  expect(await screen.findByText('ยังไม่มีบทความ')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'เขียนบทความใหม่' })).toHaveLength(2);
});
