package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"petfinder/store"
)

// pingEvery ส่ง ping เป็นระยะ กัน proxy ระหว่างทาง (เช่นของ Render) ตัดการเชื่อมต่อที่เงียบนานเกินไป
// และรู้ตัวเร็วขึ้นถ้าฝั่งเบราว์เซอร์หายไปเฉย ๆ (ปิดฝาโน้ตบุ๊ก เน็ตหลุด)
const pingEvery = 30 * time.Second

// seatsMsg ข้อความที่ส่งทาง WebSocket: SeatMap ทั้งก้อน + "type": "seats" (ดู openapi.yaml)
// embed SeatMap ทำให้ฟิลด์ tripId kind seatCount taken อยู่ระดับเดียวกับ type ใน JSON
type seatsMsg struct {
	Type string `json:"type"`
	store.SeatMap
}

func (h *Handler) seatsJSON(ctx context.Context, tripID int64) ([]byte, error) {
	m, err := h.Store.TripSeats(ctx, tripID)
	if err != nil {
		return nil, err
	}
	return json.Marshal(seatsMsg{Type: "seats", SeatMap: m})
}

// notifySeats ประกาศผังที่นั่งล่าสุดของรอบ ให้ทุกคนที่เปิดหน้ารอบนั้นอยู่ เรียกหลังจอง/ยกเลิกสำเร็จ
// การจองสำเร็จไปแล้ว ถ้าประกาศไม่สำเร็จแค่จด log ไม่ทำให้คำขอนั้นล้ม (หน้าเว็บยังกดรีเฟรชเองได้)
func (h *Handler) notifySeats(tripID int64) {
	msg, err := h.seatsJSON(context.Background(), tripID)
	if err != nil {
		log.Printf("notify seats trip %d: %v", tripID, err)
		return
	}
	h.Live.Publish(tripID, msg)
}

// notifyClosed ประกาศว่ารอบนี้ถูกยกเลิก หน้าเว็บโหลดสถานะรอบใหม่แล้วซ่อนผังที่นั่งเอง
func (h *Handler) notifyClosed(tripID int64) {
	msg, _ := json.Marshal(map[string]any{"type": "closed", "tripId": tripID})
	h.Live.Publish(tripID, msg)
}

// TripLive  GET /api/trips/{id}/live  WebSocket ผังที่นั่งแบบสด
func (h *Handler) TripLive(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	// ตรวจว่ามีรอบนี้ก่อนเปลี่ยนเป็น WebSocket ไม่มีก็ตอบ 404 แบบ HTTP ธรรมดาได้
	if _, err := h.Store.TripSeats(r.Context(), id); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	} else if err != nil {
		internal(w, err)
		return
	}

	// CORS ไม่คุ้มครอง WebSocket: เบราว์เซอร์ส่ง Origin มาแต่ไม่บล็อกให้ library จึงตรวจ Origin เอง
	// อนุญาตเฉพาะ host เดียวกับ API หรือที่อยู่ใน ALLOWED_ORIGINS (กันเว็บอื่นแอบต่อแทนผู้ใช้)
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: h.WSOrigins})
	if err != nil {
		return // Accept ตอบ 403/400 ให้แล้ว
	}
	defer conn.CloseNow()

	// สมัครรับข่าว "ก่อน" อ่านผังครั้งแรก: ถ้ามีคนจองระหว่างสองบรรทัดนี้ เราจะได้ข่าวนั้นในคิว ไม่ตกหล่น
	sub, stop := h.Live.Subscribe(id)
	defer stop()

	// หน้าเว็บไม่ส่งอะไรมา CloseRead อ่านทิ้งให้ และยกเลิก ctx ทันทีที่ฝั่งเบราว์เซอร์ปิดการเชื่อมต่อ
	ctx := conn.CloseRead(r.Context())

	send := func(msg []byte) error {
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return conn.Write(ctx, websocket.MessageText, msg)
	}

	first, err := h.seatsJSON(ctx, id)
	if err != nil || send(first) != nil {
		return
	}

	ticker := time.NewTicker(pingEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done(): // เบราว์เซอร์ปิดหน้า หรือเซิร์ฟเวอร์กำลังปิด
			return
		case msg := <-sub.C:
			if send(msg) != nil {
				return
			}
		case <-ticker.C:
			pctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := conn.Ping(pctx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}
