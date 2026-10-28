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
    <Link to="/articles" className="text-sm text-teal-700 hover:underline">
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
    <article className="space-y-4">
      {back}
      {article.coverUrl && <img src={article.coverUrl} alt="" className="w-full rounded-md object-cover" />}
      <h1 className="text-2xl font-bold">{article.title}</h1>
      <p className="text-sm text-gray-500">
        {article.author.displayName}
        {article.author.phone && ` · โทร ${article.author.phone}`} · {thaiDate(article.createdAt)}
      </p>
      <p className="whitespace-pre-line leading-relaxed">{article.body}</p>
    </article>
  );
}
export default ArticleDetail;
