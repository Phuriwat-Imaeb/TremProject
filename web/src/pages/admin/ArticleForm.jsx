import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Field from '../../components/Field';

const empty = { title: '', body: '', coverUrl: '', published: false };

// หลังบ้าน: ฟอร์มเดียวใช้ทั้งเขียนใหม่ (/admin/articles/new) และแก้ไข (/admin/articles/:id/edit)
// มี :id ใน URL = แก้ไข โหลดของเดิมมาใส่ฟอร์มก่อน
function ArticleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(isEdit ? null : empty); // null = กำลังโหลดของเดิม
  const [status, setStatus] = useState('typing'); // typing | submitting
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api
      .adminGetArticle(id, token)
      .then((a) => {
        if (cancelled) return;
        // coverUrl เป็น null ได้ แต่ช่องกรอกต้องเป็นสตริง
        setForm({ title: a.title, body: a.body, coverUrl: a.coverUrl ?? '', published: a.published });
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, token]);

  // ช่องไหนเปลี่ยน แก้แค่ช่องนั้น ช่องอื่นคงเดิม
  const set = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      if (isEdit) await api.updateArticle(id, form, token);
      else await api.createArticle(form, token);
      navigate('/admin/articles');
    } catch (err) {
      setError(err.message); // เช่น "หัวข้อต้องยาว 1-200 ตัวอักษร" จาก server
      setStatus('typing');
    }
  }

  if (!form) {
    return error ? <p role="alert" className="text-red-700">{error}</p> : <p>กำลังโหลด…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{isEdit ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="หัวข้อ" required maxLength={200} value={form.title} onChange={set('title')} />
        <Field label="เนื้อหา" as="textarea" rows={10} required value={form.body} onChange={set('body')} />
        <Field
          label="ลิงก์รูปปก"
          type="url"
          hint="ไม่บังคับ ต้องขึ้นต้นด้วย https://"
          value={form.coverUrl}
          onChange={set('coverUrl')}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={set('published')} />
          เผยแพร่ (ไม่ติ๊ก = เก็บเป็นฉบับร่าง หน้าบ้านมองไม่เห็น)
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {status === 'submitting' ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/articles')}
            className="rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}
export default ArticleForm;
