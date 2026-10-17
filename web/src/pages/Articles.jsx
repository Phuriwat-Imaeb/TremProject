import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';

export const thaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' });

// หน้าบ้าน: รายการบทความที่เผยแพร่แล้ว (แม่แบบหน้า "รายการ")
function Articles() {
  const { token } = useAuth();
  const [items, setItems] = useState(null); // null = ยังโหลดไม่เสร็จ
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false; // ออกจากหน้าก่อนโหลดเสร็จ ไม่ต้อง setState แล้ว
    api
      .listArticles(token)
      .then((data) => !cancelled && setItems(data.items))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!items) return <p>กำลังโหลด…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">บทความ</h1>
      {items.length === 0 && <p className="text-gray-600">ยังไม่มีบทความ</p>}
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-md border border-gray-200 bg-white p-4">
            <Link to={`/articles/${a.id}`} className="text-lg font-semibold text-teal-700 hover:underline">
              {a.title}
            </Link>
            <p className="text-sm text-gray-500">
              {a.author.displayName} · {thaiDate(a.createdAt)}
            </p>
            <p className="mt-2 line-clamp-2 text-gray-700">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default Articles;
