import { useEffect, useRef, useState } from 'react';
import { liveSeatsURL } from '../api/backend';

// หลุดแล้วต่อใหม่ช้าลงเรื่อย ๆ 1, 2, 4, ... สูงสุด 30 วินาที (Render แบบฟรีตื่นช้า ไม่ต้องรัวใส่)
const retryDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000);

// ต่อ WebSocket ผังที่นั่งของรอบ tripId ค้างไว้ตลอดที่อยู่หน้านี้ ได้ข้อความเมื่อไรเรียก onMessage(msg)
//   msg = { type: 'seats', tripId, kind, seatCount, taken } หรือ { type: 'closed', tripId }
// คืน connected (true/false) ไว้โชว์ว่ากำลังอัปเดตสดอยู่ไหม
export default function useLiveSeats(tripId, onMessage) {
  const [connected, setConnected] = useState(false);
  // เก็บ onMessage ล่าสุดไว้ใน ref: คนเรียกส่งฟังก์ชันใหม่ทุก render ถ้าใส่ใน deps จะต่อใหม่ทุก render
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    let ws;
    let timer;
    let attempt = 0;
    let stopped = false; // ออกจากหน้าแล้ว ห้ามต่อใหม่

    function connect() {
      ws = new WebSocket(liveSeatsURL(tripId));
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          handler.current(JSON.parse(e.data));
        } catch {
          // ข้อความเสีย ข้ามไป รอข้อความถัดไป
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) timer = setTimeout(connect, retryDelay(attempt++));
      };
    }
    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      ws.close();
    };
  }, [tripId]);

  return connected;
}
