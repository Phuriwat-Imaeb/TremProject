import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHero from '../components/PageHero';
import Pagination from '../components/Pagination';
import SearchBox from '../components/SearchBox';
import useApi from '../hooks/useApi';
import useListQuery from '../hooks/useListQuery';
import usePageTitle from '../hooks/usePageTitle';

export const thaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' });

// หน้าบ้าน: รายการบทความที่เผยแพร่แล้ว ค้นหา + แบ่งหน้า (แม่แบบหน้า "รายการ")
function Articles() {
  usePageTitle('บทความ');
  const { token } = useAuth();
  const { q, page, setQ } = useListQuery();
  const { data, error, loading } = useApi(() => api.listArticles({ q, page }, token), [q, page, token]);

  return (
    <div>
      <PageHero title="บทความ" subtitle="เกร็ดการเดินทาง ข่าวสาร และประกาศจากเรา">
        {/* key: กด back จน q ใน URL เปลี่ยน ช่องค้นหาต้องเปลี่ยนตาม */}
        <SearchBox key={q} value={q} onSearch={setQ} placeholder="ค้นหาบทความ…" />
      </PageHero>
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && (
        <EmptyState message={q ? `ไม่พบบทความที่ตรงกับ "${q}"` : 'ยังไม่มีบทความ'} />
      )}
      <ul className="space-y-3">
        {data?.items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
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
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
    </div>
  );
}
export default Articles;
