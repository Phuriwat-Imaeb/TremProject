import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import useApi from '../../hooks/useApi';
import usePageTitle from '../../hooks/usePageTitle';

const empty = { title: '', body: '', coverUrl: '', published: false };

// หลังบ้าน: หน้าเดียวใช้ทั้งเขียนใหม่ (/admin/articles/new) และแก้ไข (/admin/articles/:id/edit)
// มี :id ใน URL = แก้ไข โหลดของเดิมให้เสร็จก่อน แล้วค่อยส่งเป็นค่าตั้งต้นให้ฟอร์ม
function ArticleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  usePageTitle(isEdit ? 'แก้ไขบทความ' : 'เขียนบทความใหม่');
  const { token } = useAuth();
  // หน้าเขียนใหม่ไม่ต้องโหลดอะไร คืน null ให้ useApi ข้ามไป
  const { data, error, loading } = useApi(() => (isEdit ? api.adminGetArticle(id, token) : null), [id, token]);

  if (loading) return <Loading />;
  if (error) return <Alert>{error.message}</Alert>;

  // coverUrl เป็น null ได้ แต่ช่องกรอกต้องเป็นสตริง
  const initial = data ? { title: data.title, body: data.body, coverUrl: data.coverUrl ?? '', published: data.published } : empty;
  // key: เปลี่ยนบทความ (หรือจากแก้ไขไปเขียนใหม่) ให้เริ่มฟอร์มใหม่หมด ไม่ค้างค่าของเรื่องเดิม
  return <Editor key={id ?? 'new'} id={id} initial={initial} token={token} />;
}

// ตัวฟอร์มจริง ได้ค่าตั้งต้นครบแล้วตั้งแต่ render แรก จึงไม่ต้องมี state "กำลังโหลด" ปนกับ state ของฟอร์ม
function Editor({ id, initial, token }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('typing'); // typing | submitting
  const [error, setError] = useState(null);

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
      if (id) await api.updateArticle(id, form, token);
      else await api.createArticle(form, token);
      toast.success(id ? 'บันทึกการแก้ไขแล้ว' : 'สร้างบทความแล้ว');
      navigate('/admin/articles');
    } catch (err) {
      setError(err.message); // เช่น "หัวข้อต้องยาว 1-200 ตัวอักษร" จาก server
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{id ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}</h1>
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
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/articles')}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
}
export default ArticleForm;
