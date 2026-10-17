import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { thaiDate } from './Articles';

// หน้าบ้าน: อ่านบทความหนึ่งเรื่อง (แม่แบบหน้า "รายละเอียด") id มาจาก URL /articles/:id
function ArticleDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getArticle(id, token)
      .then((a) => !cancelled && setArticle(a))
      .catch((err) => !cancelled && setError(err.message)); // ฉบับร่างหรือไม่มี → "ไม่พบรายการนี้"
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (error) {
    return (
      <p role="alert" className="text-red-700">
        {error}{' '}
        <Link to="/articles" className="text-teal-700 hover:underline">
          กลับไปหน้ารายการ
        </Link>
      </p>
    );
  }
  if (!article) return <p>กำลังโหลด…</p>;

  return (
    <article className="space-y-4">
      <Link to="/articles" className="text-sm text-teal-700 hover:underline">
        ← บทความทั้งหมด
      </Link>
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
