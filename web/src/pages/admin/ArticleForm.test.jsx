import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../../api/backend';
import { AuthProvider } from '../../auth/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import ArticleForm from './ArticleForm';

jest.mock('../../api/backend');

const admin = { id: 1, email: 'admin@petfinder.test', displayName: 'แอดมิน', role: 'admin' };

// จำลองว่า login ไว้แล้ว: AuthProvider อ่าน token + member จาก localStorage ตอนเริ่ม
// getMe ไม่ตอบเลย เพราะ member มีอยู่แล้ว และไม่ให้มา setState ตอนเทสต์ทำอย่างอื่นอยู่ (warning act)
function loginAs(member) {
  localStorage.setItem('petfinder.token', 'tok');
  localStorage.setItem('petfinder.member', JSON.stringify(member));
  api.getMe.mockReturnValue(new Promise(() => {}));
}

function renderAt(path) {
  const guarded = (
    <ProtectedRoute roles={['admin']}>
      <ArticleForm />
    </ProtectedRoute>
  );
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/articles/new" element={guarded} />
          <Route path="/admin/articles/:id/edit" element={guarded} />
          <Route path="/admin/articles" element={<p>หน้ารายการหลังบ้าน</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

test('เขียนบทความใหม่ ส่งค่าที่กรอกไป server แล้วกลับไปหน้ารายการ', async () => {
  loginAs(admin);
  api.createArticle.mockResolvedValue({ id: 9 });

  renderAt('/admin/articles/new');
  await userEvent.type(screen.getByLabelText('หัวข้อ'), 'ข่าวใหม่');
  await userEvent.type(screen.getByLabelText('เนื้อหา'), 'รายละเอียด');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

  expect(await screen.findByText('หน้ารายการหลังบ้าน')).toBeInTheDocument();
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

test('member ธรรมดาเข้าหน้าหลังบ้านไม่ได้', async () => {
  loginAs({ ...admin, id: 3, role: 'member' });
  renderAt('/admin/articles/new');
  expect(screen.getByText('บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้')).toBeInTheDocument();
  expect(screen.queryByLabelText('หัวข้อ')).not.toBeInTheDocument();
});
