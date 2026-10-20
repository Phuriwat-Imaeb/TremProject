// จัดรูปแบบวันเวลาและเงินให้เป็นแบบไทย ใช้ร่วมกันทุกหน้าของการจอง
// ระบุ timeZone เสมอ คนเปิดเว็บจากต่างประเทศก็เห็นเวลารถออกตามเวลาไทยเหมือนกัน
const TZ = 'Asia/Bangkok';

// "อ. 21 ต.ค. 2569"
export const thaiDay = (iso) =>
  new Date(iso).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });

// "07:00"
export const thaiTime = (iso) =>
  new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

// "1,250 บาท"
export const baht = (n) => `${n.toLocaleString('th-TH')} บาท`;

// วันนี้ตามเวลาไทยแบบ YYYY-MM-DD (en-CA เรียงปี-เดือน-วันพอดี) ไว้เป็นค่า min ของช่องเลือกวัน
export const todayInThai = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

export const VEHICLE_LABEL = { van: 'รถตู้', bus: 'รถทัวร์' };
