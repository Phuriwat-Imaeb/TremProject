import { Link } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { ArticleArt } from '../components/CardArt';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchBox from '../components/SearchBox';
import useApi from '../hooks/useApi';
import useListQuery from '../hooks/useListQuery';
import usePageTitle from '../hooks/usePageTitle';

export const thaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' });

const TINTS = ['bg-tint-peach', 'bg-tint-mint', 'bg-tint-butter', 'bg-tint-sky'];

// ภาพปกของบทความ ไม่มีรูปก็ใช้ภาพประกอบบนพื้นสีอ่อน
function Cover({ article, index, className }) {
  if (article.coverUrl) return <img src={article.coverUrl} alt="" className={`w-full object-cover ${className}`} />;
  return (
    <div className={`${TINTS[index % TINTS.length]} ${className}`}>
      <ArticleArt />
    </div>
  );
}

// หน้าบ้าน: รายการบทความที่เผยแพร่แล้ว ค้นหา + แบ่งหน้า (แม่แบบหน้า "รายการ")
function Articles() {
  usePageTitle('บทความ');
  const { token } = useAuth();
  const { q, page, setQ } = useListQuery();
  const { data, error, loading } = useApi(() => api.listArticles({ q, page }, token), [q, page, token]);
  // หน้าแรกที่ไม่ได้ค้นหา บทความล่าสุดขึ้นเป็นการ์ดใหญ่ "บทความแนะนำ" (แบบ F11) ที่เหลือเป็นตาราง 3 คอลัมน์
  const items = data?.items ?? [];
  const featured = page === 1 && !q ? items[0] : null;
  const rest = featured ? items.slice(1) : items;

  return (
    <div>
      <PageHeader title="บทความน่ารู้" subtitle="ข่าวสาร ประกาศ และเคล็ดลับก่อนออกเดินทาง" crumbs={[{ to: '/', label: 'หน้าแรก' }]} />
      {/* key: กด back จน q ใน URL เปลี่ยน ช่องค้นหาต้องเปลี่ยนตาม */}
      <SearchBox key={q} value={q} onSearch={setQ} placeholder="ค้นหาบทความ…" />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 && (
        <EmptyState message={q ? `ไม่พบบทความที่ตรงกับ "${q}"` : 'ยังไม่มีบทความ'} />
      )}
      {/* ลิงก์อยู่ที่ชื่อบทความ แล้วขยายพื้นที่กดให้เต็มการ์ดด้วย after:inset-0 ชื่อลิงก์จึงสั้น อ่านง่ายสำหรับโปรแกรมอ่านหน้าจอ */}
      {featured && (
        <article className="relative mb-6 grid overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:shadow-lg md:grid-cols-2">
          <Cover article={featured} index={0} className="h-56 md:h-full" />
          <div className="space-y-4 p-6 sm:p-10">
            <Badge tone="brand">บทความแนะนำ</Badge>
            <h2 className="text-2xl font-bold sm:text-3xl">
              <Link to={`/articles/${featured.id}`} className="after:absolute after:inset-0">
                {featured.title}
              </Link>
            </h2>
            <p className="line-clamp-3 leading-7 text-gray-500">{featured.body}</p>
            <p className="text-xs text-gray-500">
              โดย {featured.author.displayName} · {thaiDate(featured.createdAt)}
            </p>
            <span aria-hidden="true" className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white">
              อ่านต่อ
            </span>
          </div>
        </article>
      )}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((a, i) => (
          <li key={a.id} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
            <Cover article={a} index={i + 1} className="h-40" />
            <div className="p-5">
              <p className="text-xs text-gray-500">{thaiDate(a.createdAt)}</p>
              <Link to={`/articles/${a.id}`} className="mt-1 block text-lg font-bold after:absolute after:inset-0">
                {a.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{a.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
    </div>
  );
}
export default Articles;
