// ตัวหมุนระหว่างรอ server ตอบ
function Loading({ text = 'กำลังโหลด…' }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden="true" />
      {text}
    </p>
  );
}
export default Loading;
