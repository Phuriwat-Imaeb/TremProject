import { useState } from 'react';
import Button from './Button';

// ช่องค้นหา พิมพ์ได้เรื่อย ๆ จะค้นจริงเมื่อกด Enter หรือปุ่ม "ค้นหา" (ไม่ยิง API ทุกตัวอักษร)
// value = คำค้นปัจจุบันจาก URL, onSearch(คำใหม่) ส่งกลับไปให้หน้าเปลี่ยน URL
function SearchBox({ value, onSearch, placeholder = 'ค้นหา…' }) {
  const [text, setText] = useState(value);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="mb-4 flex gap-2">
      <input
        type="search"
        aria-label="คำค้น"
        value={text}
        maxLength={100}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <Button type="submit" variant="secondary">
        ค้นหา
      </Button>
    </form>
  );
}
export default SearchBox;
