import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';

export const thaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' });

// หน้าบ้าน: รายการบทความที่เผยแพร่แล้ว (แม่แบบหน้า "รายการ")
function Articles() {
  usePageTitle('บทความ');
  const { token } = useAuth();
  const { data, error, loading } = useApi(() => api.listArticles(token), [token]);

  return (
    <div>
      <PageHeader title="บทความ" />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && <EmptyState message="ยังไม่มีบทความ" />}
      <ul className="space-y-3">
        {data?.items.map((a) => (
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
