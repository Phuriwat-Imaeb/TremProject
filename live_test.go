package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"petfinder/mw"
	"petfinder/store"
)

// เทสต์ WebSocket ต้องมีเซิร์ฟเวอร์จริง (httptest.NewServer) เพราะต้องเปลี่ยนการเชื่อมต่อเป็น WebSocket
// ครอบ mw.Logging ไว้ด้วย เพื่อเช็กว่า recorder ส่งต่อ Hijack ได้จริง (ไม่งั้นได้ 501)

type liveMsg struct {
	Type   string
	TripID int64
	Taken  []int16
}

// dialLive ต่อ WebSocket ไปที่ผังของรอบ แล้วคืนฟังก์ชันอ่านข้อความถัดไป (รอไม่เกิน 5 วินาที)
func dialLive(t *testing.T, base string, tripID int64) func() liveMsg {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(base, "http") + fmt.Sprintf("/api/trips/%d/live", tripID)
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("ต่อ WebSocket ไม่ได้: %v", err)
	}
	t.Cleanup(func() { conn.Close(websocket.StatusNormalClosure, "") })

	return func() liveMsg {
		t.Helper()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, data, err := conn.Read(ctx)
		if err != nil {
			t.Fatalf("รอข้อความแล้วไม่มา: %v", err)
		}
		var m liveMsg
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("ข้อความไม่ใช่ JSON: %s", data)
		}
		return m
	}
}

func TestLiveSeats(t *testing.T) {
	srv, tickets := newTestServer(t)
	ts := httptest.NewServer(mw.Logging(srv))
	defer ts.Close()
	ton, _ := tickets.Issue(4, "member")

	// ต่อแล้วได้ผังปัจจุบันทันที (รอบ 2 ยังไม่มีใครจอง)
	next := dialLive(t, ts.URL, 2)
	if m := next(); m.Type != "seats" || m.TripID != 2 || fmt.Sprint(m.Taken) != "[]" {
		t.Fatalf("ข้อความแรกต้องเป็นผังว่างของรอบ 2 ได้ %+v", m)
	}

	// มีคนจอง → คนที่เปิดผังอยู่ได้ผังใหม่เอง ไม่ต้องรีเฟรช
	var b store.Booking
	if code := call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": 2, "seats": []int{6, 7}}, &b); code != 201 {
		t.Fatalf("จองต้องได้ 201 ได้ %d", code)
	}
	t.Cleanup(func() { dbExec(t, `DELETE FROM bookings WHERE id = $1`, b.ID) })
	if m := next(); fmt.Sprint(m.Taken) != "[6 7]" {
		t.Errorf("จองแล้วต้องได้ผังใหม่ [6 7] ได้ %+v", m)
	}

	// ยกเลิก → ได้ผังที่ว่างกลับมา
	call(t, srv, "POST", fmt.Sprintf("/api/bookings/%d/cancel", b.ID), ton, nil, nil)
	if m := next(); fmt.Sprint(m.Taken) != "[]" {
		t.Errorf("ยกเลิกแล้วต้องได้ผังว่าง ได้ %+v", m)
	}
}

func TestLiveTripClosed(t *testing.T) {
	srv, tickets := newTestServer(t)
	ts := httptest.NewServer(srv)
	defer ts.Close()
	staff, _ := tickets.Issue(2, "staff")

	var tr store.Trip
	call(t, srv, "POST", "/api/staff/trips", staff,
		map[string]any{"routeId": 2, "vehicleId": 2, "departAt": time.Now().Add(96 * time.Hour).Truncate(time.Minute), "priceBaht": 80}, &tr)
	t.Cleanup(func() { dbExec(t, `DELETE FROM trips WHERE id = $1`, tr.ID) })

	next := dialLive(t, ts.URL, tr.ID)
	next() // ผังแรก
	call(t, srv, "POST", fmt.Sprintf("/api/staff/trips/%d/cancel", tr.ID), staff, nil, nil)
	if m := next(); m.Type != "closed" || m.TripID != tr.ID {
		t.Errorf("ยกเลิกรอบแล้วต้องได้ closed ได้ %+v", m)
	}
}

func TestLiveRejects(t *testing.T) {
	srv, _ := newTestServer(t)
	ts := httptest.NewServer(srv)
	defer ts.Close()
	base := "ws" + strings.TrimPrefix(ts.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// ไม่มีรอบนี้ → 404 ตั้งแต่ยังไม่เปลี่ยนเป็น WebSocket
	if _, resp, err := websocket.Dial(ctx, base+"/api/trips/999999/live", nil); err == nil || resp == nil || resp.StatusCode != 404 {
		t.Errorf("รอบที่ไม่มีต้องได้ 404 ได้ %v %v", resp, err)
	}

	// เว็บอื่นแอบต่อแทนผู้ใช้ไม่ได้ (Origin ไม่อยู่ในรายการ) → 403
	opts := &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {"https://evil.example"}}}
	if _, resp, err := websocket.Dial(ctx, base+"/api/trips/1/live", opts); err == nil || resp == nil || resp.StatusCode != 403 {
		t.Errorf("origin แปลกปลอมต้องได้ 403 ได้ %v %v", resp, err)
	}
}
