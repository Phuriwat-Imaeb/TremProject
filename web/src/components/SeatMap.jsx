// ผังที่นั่ง: ปุ่มละหนึ่งที่นั่ง กดเลือก/เลิกเลือก ที่ไม่ว่างกดไม่ได้
//   รถตู้ (van)  3 ที่ต่อแถว
//   รถทัวร์ (bus) 2 + ทางเดิน + 2 (ช่องกลางของ grid 5 คอลัมน์ปล่อยว่างไว้เป็นทางเดิน)
// คอมโพเนนต์นี้แค่วาดและแจ้งว่ากดที่ไหน (onToggle) ส่วนจะเก็บที่เลือกไว้ที่ไหน หน้าที่เรียกเป็นคนตัดสิน
const LAYOUT = {
  van: { cols: 'grid-cols-3', perRow: 3, aisleAfter: null },
  bus: { cols: 'grid-cols-5', perRow: 4, aisleAfter: 2 },
};

const seatClass = {
  free: 'border-teal-600 bg-white text-teal-800 hover:bg-teal-50',
  selected: 'border-teal-700 bg-teal-600 text-white',
  taken: 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400 line-through',
};

// แบ่งเลข 1..seatCount เป็นแถว ๆ ละ perRow ที่
function rowsOf(seatCount, perRow) {
  const rows = [];
  for (let first = 1; first <= seatCount; first += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, seatCount - first + 1) }, (_, i) => first + i));
  }
  return rows;
}

function SeatMap({ kind, seatCount, taken, selected, onToggle }) {
  const { cols, perRow, aisleAfter } = LAYOUT[kind] ?? LAYOUT.van;
  const takenSet = new Set(taken);

  return (
    <div>
      <div role="group" aria-label="ผังที่นั่ง" className={`mx-auto grid max-w-xs gap-2 ${cols}`}>
        {rowsOf(seatCount, perRow).flatMap((row) =>
          row.flatMap((no, i) => {
            const state = takenSet.has(no) ? 'taken' : selected.includes(no) ? 'selected' : 'free';
            const seat = (
              <button
                key={no}
                type="button"
                disabled={state === 'taken'}
                aria-pressed={state === 'selected'}
                aria-label={`ที่นั่ง ${no}${state === 'taken' ? ' ไม่ว่าง' : ''}`}
                onClick={() => onToggle(no)}
                className={`h-11 rounded-md border-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${seatClass[state]}`}
              >
                {no}
              </button>
            );
            // ทางเดินของรถทัวร์ คั่นหลังที่นั่งที่ 2 ของแถว
            return i + 1 === aisleAfter ? [seat, <span key={`aisle-${no}`} aria-hidden="true" />] : [seat];
          })
        )}
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-4 w-4 rounded border-2 ${seatClass.free}`} /> ว่าง
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-4 w-4 rounded border-2 ${seatClass.selected}`} /> ที่เลือก
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-4 w-4 rounded border-2 ${seatClass.taken}`} /> ไม่ว่าง
        </li>
      </ul>
    </div>
  );
}
export default SeatMap;
