import { Link, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import useApi from '../hooks/useApi';
import usePageTitle from '../hooks/usePageTitle';
import { thaiDate } from './Articles';

// หน้าบ้าน: อ่านบทความหนึ่งเรื่อง (แม่แบบหน้า "รายละเอียด") id มาจาก URL /articles/:id
function ArticleDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data: article, error, loading } = useApi(() => api.getArticle(id, token), [id, token]);
  usePageTitle(article?.title ?? 'บทความ');

  const back = (
    <Link to="/articles" className="text-sm text-brand-700 hover:underline">
      ← บทความทั้งหมด
    </Link>
  );

  if (loading) return <Loading />;
  if (error) {
    // ฉบับร่างหรือไม่มี server ตอบ 404 "ไม่พบรายการนี้"
    return (
      <div className="space-y-4">
        {back}
        <Alert>{error.message}</Alert>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {back}
      {article.coverUrl && <img src={article.coverUrl} alt="" className="max-h-96 w-full rounded-3xl object-cover" />}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
      <p className="text-sm text-gray-500">
        {article.author.displayName}
        {article.author.phone && ` · โทร ${article.author.phone}`} · {thaiDate(article.createdAt)}
      </p>
      <p className="whitespace-pre-line rounded-2xl border border-gray-200 bg-white p-6 leading-8 sm:p-8">{article.body}</p>
    </article>
  );
}
export default ArticleDetail;
