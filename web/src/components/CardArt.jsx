// ภาพประกอบของการ์ดที่ไม่มีรูปจริง วาดเป็น SVG ด้วยสีชุดเดียวกับแบบ ไม่ต้องโหลดไฟล์ภาพ
// พื้นฟ้าเป็นสีโปร่ง ให้ class พื้น (bg-tint-*) ของกล่องที่ครอบอยู่โผล่มาเป็นสีท้องฟ้า แต่ละใบจึงสีไม่ซ้ำกัน

// เนินเขาสองชั้นกับดวงอาทิตย์ ใช้เป็นฉากหลังทุกภาพ
function Backdrop() {
  return (
    <>
      <circle cx="252" cy="44" r="20" fill="#fff4d1" />
      <circle cx="252" cy="44" r="13" fill="#f6b285" />
      <path d="M0 118 C50 86 92 92 132 108 C176 84 236 80 320 112 V180 H0 Z" fill="#c6e9e2" />
      <path d="M0 132 C60 112 120 120 170 130 C220 116 270 116 320 128 V180 H0 Z" fill="#a8dccf" />
    </>
  );
}

// ถนนเส้นตรงด้านล่าง มีเส้นประกลางถนน
function Road() {
  return (
    <>
      <rect x="0" y="146" width="320" height="34" fill="#4a403a" />
      <path d="M0 163 H320" stroke="#fdebdd" strokeWidth="3" strokeDasharray="16 12" />
    </>
  );
}

function Wheel({ cx }) {
  return (
    <>
      <circle cx={cx} cy="150" r="10" fill="#2b2420" />
      <circle cx={cx} cy="150" r="4" fill="#d8cfc4" />
    </>
  );
}

function Van() {
  return (
    <g>
      <path d="M96 150 V112 Q96 100 108 100 H196 Q206 100 212 108 L228 128 Q232 132 232 140 V150 Z" fill="#f2762e" />
      <path d="M198 106 L218 130 H198 Z" fill="#e3edfc" />
      <rect x="108" y="108" width="24" height="20" rx="3" fill="#e3edfc" />
      <rect x="138" y="108" width="24" height="20" rx="3" fill="#e3edfc" />
      <rect x="168" y="108" width="24" height="20" rx="3" fill="#e3edfc" />
      <rect x="96" y="136" width="136" height="5" fill="#c7591c" />
      <rect x="224" y="134" width="8" height="5" rx="2" fill="#fff4d1" />
      <Wheel cx={124} />
      <Wheel cx={206} />
    </g>
  );
}

function Bus() {
  return (
    <g>
      <rect x="56" y="88" width="204" height="62" rx="10" fill="#1f8a7a" />
      {[68, 98, 128, 158, 188, 218].map((x) => (
        <rect key={x} x={x} y="98" width="24" height="22" rx="3" fill="#e3edfc" />
      ))}
      <rect x="246" y="98" width="10" height="38" rx="2" fill="#e3edfc" />
      <rect x="56" y="128" width="204" height="6" fill="#f2762e" />
      <rect x="252" y="140" width="8" height="5" rx="2" fill="#fff4d1" />
      <Wheel cx={92} />
      <Wheel cx={222} />
    </g>
  );
}

function Svg({ label, children, className }) {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" role="img" aria-label={label} className={className}>
      {children}
    </svg>
  );
}

// รถตู้หรือรถทัวร์วิ่งบนถนน ตามชนิดรถของรอบ
export function VehicleArt({ kind = 'bus', className = 'h-full w-full' }) {
  return (
    <Svg label={kind === 'van' ? 'ภาพรถตู้' : 'ภาพรถทัวร์'} className={className}>
      <Backdrop />
      <Road />
      {kind === 'van' ? <Van /> : <Bus />}
    </Svg>
  );
}

// ถนนคดเคี้ยวจากต้นทาง (หมุดเขียว) ไปปลายทาง (หมุดส้ม)
export function RouteArt({ className = 'h-full w-full' }) {
  return (
    <Svg label="ภาพเส้นทาง" className={className}>
      <Backdrop />
      <path d="M60 180 C80 150 210 160 200 136 C192 118 150 124 170 108" fill="none" stroke="#4a403a" strokeWidth="18" strokeLinecap="round" />
      <path d="M60 180 C80 150 210 160 200 136 C192 118 150 124 170 108" fill="none" stroke="#fdebdd" strokeWidth="2" strokeDasharray="8 8" />
      <g transform="translate(70 164)">
        <path d="M0 0 C-10 -12 -12 -18 -12 -22 A12 12 0 0 1 12 -22 C12 -18 10 -12 0 0 Z" fill="#1f8a7a" />
        <circle cy="-22" r="5" fill="#fff" />
      </g>
      <g transform="translate(170 96)">
        <path d="M0 0 C-10 -12 -12 -18 -12 -22 A12 12 0 0 1 12 -22 C12 -18 10 -12 0 0 Z" fill="#f2762e" />
        <circle cy="-22" r="5" fill="#fff" />
      </g>
    </Svg>
  );
}

// ป้ายบอกทางข้างทาง ใช้กับบทความที่ไม่มีภาพปก
export function ArticleArt({ className = 'h-full w-full' }) {
  return (
    <Svg label="ภาพประกอบบทความ" className={className}>
      <Backdrop />
      <Road />
      <rect x="154" y="74" width="6" height="74" fill="#62574f" />
      <path d="M118 78 H192 L204 90 L192 102 H118 Z" fill="#f2762e" />
      <path d="M196 108 H124 L112 120 L124 132 H196 Z" fill="#1f8a7a" />
      <rect x="128" y="86" width="50" height="5" rx="2" fill="#fff" opacity="0.85" />
      <rect x="132" y="116" width="44" height="5" rx="2" fill="#fff" opacity="0.85" />
      <path d="M58 146 L70 112 L82 146 Z" fill="#1a7365" />
      <path d="M244 146 L258 104 L272 146 Z" fill="#1a7365" />
    </Svg>
  );
}
