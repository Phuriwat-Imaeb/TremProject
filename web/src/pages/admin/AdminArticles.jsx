import { useState } from 'react';
import * as api from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button, { ButtonLink } from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import SearchBox from '../../components/SearchBox';
import { useToast } from '../../components/Toast';
import useApi from '../../hooks/useApi';
import useListQuery from '../../hooks/useListQuery';
import usePageTitle from '../../hooks/usePageTitle';
import { thaiDate } from '../Articles';

// หลังบ้าน: ตารางบทความทั้งหมดรวมฉบับร่าง พร้อมปุ่มเขียนใหม่ แก้ไข ลบ (แม่แบบหน้า "จัดการ")
function AdminArticles() {
  usePageTitle('จัดการบทความ');
  const { token } = useAuth();
  const toast = useToast();
  const { q, page, setQ } = useListQuery();
  const { data, error, loading, setData } = useApi(() => api.adminListArticles({ q, page }, token), [q, page, token]);

  const [toDelete, setToDelete] = useState(null); // บทความที่กำลังถามยืนยันลบ null = กล่องปิด
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteArticle(toDelete.id, token);
      // ลบออกจากตารางในมือเลย ไม่ต้องโหลดทั้งหมดใหม่
      setData((d) => ({ ...d, items: d.items.filter((x) => x.id !== toDelete.id), total: d.total - 1 }));
      toast.success(`ลบ "${toDelete.title}" แล้ว`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const newButton = <ButtonLink to="/admin/articles/new">เขียนบทความใหม่</ButtonLink>;

  return (
    <div>
      <PageHeader title="จัดการบทความ">{newButton}</PageHeader>
      <SearchBox key={q} value={q} onSearch={setQ} placeholder="ค้นหาบทความ รวมฉบับร่าง…" />
      {loading && !data && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data?.items.length === 0 &&
        (q ? (
          <EmptyState message={`ไม่พบบทความที่ตรงกับ "${q}"`} />
        ) : (
          <EmptyState message="ยังไม่มีบทความ">{newButton}</EmptyState>
        ))}
      {data?.items.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {data.items.map((a) => (
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
              <div className="flex gap-1">
                <ButtonLink variant="ghost" to={`/admin/articles/${a.id}/edit`}>
                  แก้ไข
                </ButtonLink>
                <Button variant="ghostDanger" onClick={() => setToDelete(a)}>
                  ลบ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />}
      <ConfirmDialog
        open={toDelete !== null}
        title="ลบบทความนี้?"
        message={toDelete && `"${toDelete.title}" จะถูกลบถาวร กู้คืนไม่ได้`}
        confirmLabel="ลบ"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
export default AdminArticles;
