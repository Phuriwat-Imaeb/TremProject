package live

import "testing"

func TestPublishOnlyToSameTrip(t *testing.T) {
	h := NewHub()
	a, stopA := h.Subscribe(1)
	b, stopB := h.Subscribe(1)
	other, stopOther := h.Subscribe(2)
	defer stopOther()

	h.Publish(1, []byte("ผังใหม่"))
	for name, s := range map[string]*Sub{"a": a, "b": b} {
		select {
		case got := <-s.C:
			if string(got) != "ผังใหม่" {
				t.Errorf("%s ได้ %q", name, got)
			}
		default:
			t.Errorf("%s ต้องได้ข่าวของรอบ 1", name)
		}
	}
	select {
	case <-other.C:
		t.Error("คนดูรอบ 2 ต้องไม่ได้ข่าวของรอบ 1")
	default:
	}

	stopA()
	stopB()
	if n := h.Count(1); n != 0 {
		t.Errorf("ยกเลิกครบแล้วต้องเหลือ 0 คน ได้ %d", n)
	}
}

// คนที่ไม่อ่านเลยจนคิวเต็ม ต้องไม่ทำให้ Publish ค้าง
func TestPublishSkipsFullSubscriber(t *testing.T) {
	h := NewHub()
	_, stop := h.Subscribe(1)
	defer stop()
	for range sendBuffer + 5 {
		h.Publish(1, []byte("x")) // ถ้าค้าง เทสต์จะ timeout
	}
}
