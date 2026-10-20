// Package live กระจายข่าวแบบสดให้หน้าเว็บที่ต่อ WebSocket ค้างไว้
//
// หลักการ: แต่ละคนที่เปิดหน้าผังที่นั่งของรอบไหน จะ "สมัครรับข่าว" ของรอบนั้นไว้ (Subscribe)
// พอมีคนจอง/ยกเลิก handler จะ "ประกาศ" (Publish) ผังใหม่ ทุกคนที่สมัครรอบนั้นได้รับพร้อมกัน
//
// hub เก็บไว้ในหน่วยความจำของ process เดียว ใช้ได้เพราะ API รันเครื่องเดียว (Render แบบฟรี)
// ถ้าวันหนึ่งรันหลายเครื่อง ต้องเปลี่ยนไปใช้ตัวกลางร่วม เช่น LISTEN/NOTIFY ของ Postgres
package live

import "sync"

// sendBuffer ข่าวที่ค้างส่งได้ต่อคน ถ้าคนไหนรับไม่ทัน (เน็ตช้า) จนเต็ม ข่าวใหม่ของคนนั้นจะถูกทิ้ง
// ไม่ให้คนช้าคนเดียวถ่วงการประกาศของทุกคน (ผังที่นั่งรอบถัดไปมีข้อมูลครบอยู่แล้ว ทิ้งรอบเก่าได้ไม่เสียหาย)
const sendBuffer = 8

// Sub คือผู้สมัครรับข่าวหนึ่งคน อ่านข่าวจาก C
type Sub struct {
	C chan []byte
}

// Hub ทะเบียนว่าใครรับข่าวรอบไหนอยู่ ใช้พร้อมกันหลาย goroutine ได้ (มี mutex คุม)
type Hub struct {
	mu   sync.Mutex
	subs map[int64]map[*Sub]struct{} // tripID → ชุดของผู้สมัคร
}

func NewHub() *Hub {
	return &Hub{subs: map[int64]map[*Sub]struct{}{}}
}

// Subscribe สมัครรับข่าวของรอบ tripID คืนผู้สมัคร และฟังก์ชันยกเลิกที่ต้องเรียกเมื่อเลิกฟัง (ปิดหน้า/หลุด)
func (h *Hub) Subscribe(tripID int64) (*Sub, func()) {
	s := &Sub{C: make(chan []byte, sendBuffer)}
	h.mu.Lock()
	if h.subs[tripID] == nil {
		h.subs[tripID] = map[*Sub]struct{}{}
	}
	h.subs[tripID][s] = struct{}{}
	h.mu.Unlock()

	return s, func() {
		h.mu.Lock()
		delete(h.subs[tripID], s)
		if len(h.subs[tripID]) == 0 {
			delete(h.subs, tripID) // ไม่มีใครดูรอบนี้แล้ว ไม่ต้องเก็บไว้
		}
		h.mu.Unlock()
	}
}

// Publish ส่ง msg ให้ทุกคนที่ดูรอบ tripID อยู่ ไม่รอใคร (ใครคิวเต็มก็ข้ามไป)
func (h *Hub) Publish(tripID int64, msg []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for s := range h.subs[tripID] {
		select {
		case s.C <- msg:
		default:
		}
	}
}

// Count จำนวนคนที่ดูรอบ tripID อยู่ (ไว้ใช้ในเทสต์)
func (h *Hub) Count(tripID int64) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[tripID])
}
