import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as api from '../../api/backend';
import ProtectedRoute from '../../components/ProtectedRoute';
import { admin, loginAs, nida, renderWithProviders } from '../../test-utils';
import ArticleForm from './ArticleForm';

jest.mock('../../api/backend');

function renderAt(path) {
  const guarded = (
    <ProtectedRoute roles={['admin']}>
      <ArticleForm />
    </ProtectedRoute>
  );
  renderWithProviders(
    <Routes>
      <Route path="/admin/articles/new" element={guarded} />
      <Route path="/admin/articles/:id/edit" element={guarded} />
      <Route path="/admin/articles" element={<p>หน้ารายการหลังบ้าน</p>} />
    </Routes>,
    { route: path }
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

test('เขียนบทความใหม่ ส่งค่าที่กรอกไป server แล้วกลับไปหน้ารายการพร้อมข้อความสำเร็จ', async () => {
  loginAs(admin);
  api.createArticle.mockResolvedValue({ id: 9 });

  renderAt('/admin/articles/new');
  await userEvent.type(screen.getByLabelText('หัวข้อ'), 'ข่าวใหม่');
  await userEvent.type(screen.getByLabelText('เนื้อหา'), 'รายละเอียด');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(await screen.findByText('หน้ารายการหลังบ้าน')).toBeInTheDocument();
  expect(screen.getByText('สร้างบทความแล้ว')).toBeInTheDocument();
  expect(api.createArticle).toHaveBeenCalledWith(
    { title: 'ข่าวใหม่', body: 'รายละเอียด', coverUrl: '', published: true },
    'tok'
  );
});

test('แก้ไข โหลดของเดิมมาใส่ฟอร์ม และถ้า server ไม่รับ ต้องโชว์ข้อความ', async () => {
  loginAs(admin);
  api.adminGetArticle.mockResolvedValue({ id: 3, title: 'ร่างเดิม', body: 'เนื้อหาเดิม', coverUrl: null, published: false });
  api.updateArticle.mockRejectedValue(Object.assign(new Error('หัวข้อต้องยาว 1-200 ตัวอักษร'), { status: 400 }));

  renderAt('/admin/articles/3/edit');
  expect(await screen.findByDisplayValue('ร่างเดิม')).toBeInTheDocument();
  expect(api.adminGetArticle).toHaveBeenCalledWith('3', 'tok');

  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('หัวข้อต้องยาว 1-200 ตัวอักษร');
  expect(api.updateArticle).toHaveBeenCalledWith(
    '3',
    { title: 'ร่างเดิม', body: 'เนื้อหาเดิม', coverUrl: '', published: false },
    'tok'
  );
});

test('member ธรรมดาเข้าหน้าหลังบ้านไม่ได้', () => {
  loginAs(nida);
  renderAt('/admin/articles/new');
  expect(screen.getByText('บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้')).toBeInTheDocument();
  expect(screen.queryByLabelText('หัวข้อ')).not.toBeInTheDocument();
});
