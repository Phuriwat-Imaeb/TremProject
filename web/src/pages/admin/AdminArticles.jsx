import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import { thaiDate } from '../Articles';

// หลังบ้าน: ตารางบทความทั้งหมดรวมฉบับร่าง พร้อมปุ่มเขียนใหม่ แก้ไข ลบ (แม่แบบหน้า "จัดการ")
function AdminArticles() {
  const { token } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .adminListArticles(token)
      .then((data) => !cancelled && setItems(data.items))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleDelete(a) {
    if (!window.confirm(`ลบบทความ "${a.title}" ใช่ไหม? ลบแล้วกู้คืนไม่ได้`)) return;
    try {
      await api.deleteArticle(a.id, token);
      setItems((prev) => prev.filter((x) => x.id !== a.id)); // ลบออกจากตารางเลย ไม่ต้องโหลดใหม่
    } catch (err) {
      setError(err.message);
    }
  }

  if (!items && !error) return <p>กำลังโหลด…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">จัดการบทความ</h1>
        <Link
          to="/admin/articles/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          เขียนบทความใหม่
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {items?.length === 0 && <p className="text-gray-600">ยังไม่มีบทความ</p>}
      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {items?.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{a.title}</p>
              <p className="text-xs text-gray-500">
                <span className={a.published ? 'text-teal-700' : 'text-amber-700'}>
                  {a.published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                </span>{' '}
                · แก้ไขล่าสุด {thaiDate(a.updatedAt)}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link to={`/admin/articles/${a.id}/edit`} className="rounded-md px-3 py-1 text-teal-700 hover:bg-teal-50">
                แก้ไข
              </Link>
              <button onClick={() => handleDelete(a)} className="rounded-md px-3 py-1 text-red-700 hover:bg-red-50">
                ลบ
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default AdminArticles;
