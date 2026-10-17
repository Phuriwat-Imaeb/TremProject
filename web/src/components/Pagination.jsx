import { useSearchParams } from 'react-router-dom';
import { ButtonLink } from './Button';

// ปุ่มก่อนหน้า/ถัดไป เป็นลิงก์ที่เปลี่ยนแค่ ?page= ในURL (คำค้น ?q= ยังอยู่ครบ)
// มีหน้าเดียวหรือไม่มีเลย ไม่ต้องโชว์
function Pagination({ page, pageSize, total }) {
  const [params] = useSearchParams();
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const linkTo = (p) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete('page');
    else next.set('page', p);
    const qs = next.toString();
    return qs ? `?${qs}` : '?';
  };

  return (
    <nav aria-label="เลื่อนหน้า" className="mt-6 flex items-center justify-between gap-2 text-sm">
      {page > 1 ? (
        <ButtonLink variant="secondary" to={linkTo(page - 1)}>
          ← ก่อนหน้า
        </ButtonLink>
      ) : (
        <span />
      )}
      <span className="text-gray-600">
        หน้า {page} จาก {pages}
      </span>
      {page < pages ? (
        <ButtonLink variant="secondary" to={linkTo(page + 1)}>
          ถัดไป →
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
export default Pagination;
