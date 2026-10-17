import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as api from '../api/backend';
import { article, pageOf, renderWithProviders } from '../test-utils';
import Articles from './Articles';

jest.mock('../api/backend');

// โชว์ URL ปัจจุบัน ไว้เช็กว่าค้นหา/เปลี่ยนหน้าแล้ว ?q= &page= เปลี่ยนตาม
function ShowURL() {
  const { search } = useLocation();
  return <p data-testid="url">{decodeURIComponent(search)}</p>;
}

function renderAt(route) {
  renderWithProviders(
    <Routes>
      <Route
        path="/articles"
        element={
          <>
            <Articles />
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
});

test('โหลดอยู่ → ได้รายการ และมีปุ่มไปหน้าถัดไปเมื่อมีมากกว่า 1 หน้า', async () => {
  api.listArticles
    .mockResolvedValueOnce(pageOf([article(1, 'เรื่องแรก')], { total: 25 }))
    .mockResolvedValueOnce(pageOf([article(11, 'เรื่องที่สิบเอ็ด')], { page: 2, total: 25 }));
  renderAt('/articles');

  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByRole('link', { name: 'เรื่องแรก' })).toHaveAttribute('href', '/articles/1');
  expect(screen.getByText('หน้า 1 จาก 3')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '← ก่อนหน้า' })).not.toBeInTheDocument();

  // เปลี่ยนหน้าแล้วโหลดใหม่: act แบบ async รอให้ข้อมูลที่โหลดเสร็จถูก render ก่อนไปต่อ
  await act(async () => userEvent.click(screen.getByRole('link', { name: 'ถัดไป →' })));
  expect(await screen.findByText('เรื่องที่สิบเอ็ด')).toBeInTheDocument();
  expect(screen.getByText('หน้า 2 จาก 3')).toBeInTheDocument();
  expect(screen.getByTestId('url')).toHaveTextContent('?page=2');
  expect(api.listArticles).toHaveBeenLastCalledWith({ q: '', page: 2 }, null);
});

test('ค้นหา: ใส่คำใน URL กลับไปหน้า 1 และไม่เจอก็บอกว่าไม่เจออะไร', async () => {
  api.listArticles.mockResolvedValue(pageOf([article(1, 'เรื่องแรก')], { page: 2, total: 11 }));
  renderAt('/articles?page=2');
  await screen.findByText('เรื่องแรก');

  api.listArticles.mockResolvedValue(pageOf([]));
  await userEvent.type(screen.getByRole('searchbox', { name: 'คำค้น' }), '  แมวส้ม ');
  await act(async () => userEvent.click(screen.getByRole('button', { name: 'ค้นหา' })));

  expect(await screen.findByText('ไม่พบบทความที่ตรงกับ "แมวส้ม"')).toBeInTheDocument();
  expect(screen.getByTestId('url')).toHaveTextContent('?q=แมวส้ม');
  expect(api.listArticles).toHaveBeenLastCalledWith({ q: 'แมวส้ม', page: 1 }, null);
});

test('server ล่ม ต้องโชว์ข้อความ error', async () => {
  api.listArticles.mockRejectedValue(new Error('ระบบขัดข้อง ลองใหม่อีกครั้ง'));
  renderAt('/articles');
  expect(await screen.findByRole('alert')).toHaveTextContent('ระบบขัดข้อง');
});
