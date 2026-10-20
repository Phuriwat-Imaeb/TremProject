package main

import (
	"fmt"
	"testing"
	"time"

	"petfinder/store"
)

// หลังบ้าน admin: เส้นทางและคันรถ (ใช้ call / dbExec จาก main_test.go)

func TestAdminRoutes(t *testing.T) {
	srv, tickets := newTestServer(t)
	admin, _ := tickets.Issue(1, "admin")
	staff, _ := tickets.Issue(2, "staff")

	body := map[string]any{"origin": "  นครปฐม  ", "destination": "ราชบุรี", "durationMin": 50}
	if code := call(t, srv, "POST", "/api/admin/routes", staff, body, nil); code != 403 {
		t.Errorf("staff เพิ่มเส้นทางไม่ได้ ต้องได้ 403 ได้ %d", code)
	}

	var rt store.Route
	if code := call(t, srv, "POST", "/api/admin/routes", admin, body, &rt); code != 201 || rt.Origin != "นครปฐม" || rt.ID == 0 {
		t.Fatalf("เพิ่มเส้นทางต้องได้ 201 และตัดช่องว่าง ได้ %d %+v", code, rt)
	}
	t.Cleanup(func() { dbExec(t, `DELETE FROM routes WHERE id = $1`, rt.ID) })

	var e struct{ Error struct{ Code string } }
	if code := call(t, srv, "POST", "/api/admin/routes", admin, body, &e); code != 409 || e.Error.Code != "DUPLICATE" {
		t.Errorf("เส้นทางซ้ำต้องได้ 409 DUPLICATE ได้ %d %s", code, e.Error.Code)
	}
	for name, bad := range map[string]map[string]any{
		"ต้นทาง = ปลายทาง": {"origin": "นครปฐม", "destination": "นครปฐม", "durationMin": 50},
		"ไม่มีปลายทาง":     {"origin": "นครปฐม", "destination": " ", "durationMin": 50},
		"เวลาเป็นศูนย์":    {"origin": "นครปฐม", "destination": "ราชบุรี", "durationMin": 0},
	} {
		if code := call(t, srv, "POST", "/api/admin/routes", admin, bad, &e); code != 400 || e.Error.Code != "MISSING_FIELD" {
			t.Errorf("%s: ต้องได้ 400 MISSING_FIELD ได้ %d %s", name, code, e.Error.Code)
		}
	}

	path := fmt.Sprintf("/api/admin/routes/%d", rt.ID)
	edit := map[string]any{"origin": "นครปฐม", "destination": "ราชบุรี", "durationMin": 70}
	if code := call(t, srv, "PUT", path, admin, edit, &rt); code != 200 || rt.DurationMin != 70 {
		t.Errorf("แก้เส้นทางต้องได้ 200 ได้ %d %+v", code, rt)
	}
	if code := call(t, srv, "PUT", "/api/admin/routes/9999", admin, edit, nil); code != 404 {
		t.Errorf("แก้เส้นทางที่ไม่มีต้องได้ 404 ได้ %d", code)
	}

	// เส้นทาง 1 มีรอบรถใช้อยู่ ลบไม่ได้ / เส้นทางใหม่ยังไม่มีรอบ ลบได้
	if code := call(t, srv, "DELETE", "/api/admin/routes/1", admin, nil, &e); code != 409 || e.Error.Code != "IN_USE" {
		t.Errorf("ลบเส้นทางที่มีรอบต้องได้ 409 IN_USE ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "DELETE", path, admin, nil, nil); code != 204 {
		t.Errorf("ลบเส้นทางว่างต้องได้ 204 ได้ %d", code)
	}
	if code := call(t, srv, "DELETE", path, admin, nil, nil); code != 404 {
		t.Errorf("ลบซ้ำต้องได้ 404 ได้ %d", code)
	}
}

func TestAdminVehicles(t *testing.T) {
	srv, tickets := newTestServer(t)
	admin, _ := tickets.Issue(1, "admin")
	staff, _ := tickets.Issue(2, "staff")
	ton, _ := tickets.Issue(4, "member")

	var v store.Vehicle
	if code := call(t, srv, "POST", "/api/admin/vehicles", admin, map[string]any{"plate": "20-0001 นฐ", "kind": "van", "seatCount": 13}, &v); code != 201 || v.SeatCount != 13 {
		t.Fatalf("เพิ่มรถต้องได้ 201 ได้ %d %+v", code, v)
	}
	t.Cleanup(func() {
		dbExec(t, `DELETE FROM bookings WHERE trip_id IN (SELECT id FROM trips WHERE vehicle_id = $1)`, v.ID)
		dbExec(t, `DELETE FROM trips WHERE vehicle_id = $1`, v.ID)
		dbExec(t, `DELETE FROM vehicles WHERE id = $1`, v.ID)
	})

	var e struct {
		Error struct{ Code, Message string }
	}
	if code := call(t, srv, "POST", "/api/admin/vehicles", admin, map[string]any{"plate": "20-0001 นฐ", "kind": "bus", "seatCount": 40}, &e); code != 409 || e.Error.Code != "DUPLICATE" {
		t.Errorf("ทะเบียนซ้ำต้องได้ 409 DUPLICATE ได้ %d %s", code, e.Error.Code)
	}
	for name, bad := range map[string]map[string]any{
		"ประเภทแปลก":     {"plate": "x", "kind": "boat", "seatCount": 10},
		"ที่นั่งเกิน 60": {"plate": "x", "kind": "bus", "seatCount": 61},
		"ไม่มีทะเบียน":   {"plate": "", "kind": "van", "seatCount": 10},
	} {
		if code := call(t, srv, "POST", "/api/admin/vehicles", admin, bad, &e); code != 400 {
			t.Errorf("%s: ต้องได้ 400 ได้ %d", name, code)
		}
	}

	// มีรอบที่ยังไม่ออกและมีคนจองที่นั่ง 12 → ลดเหลือ 11 ไม่ได้ ลดเหลือ 12 ได้
	var tr store.Trip
	call(t, srv, "POST", "/api/staff/trips", staff,
		map[string]any{"routeId": 1, "vehicleId": v.ID, "departAt": time.Now().Add(72 * time.Hour).Truncate(time.Minute), "priceBaht": 80}, &tr)
	if code := call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": tr.ID, "seats": []int{12}}, nil); code != 201 {
		t.Fatalf("จองที่นั่ง 12 ต้องได้ 201 ได้ %d", code)
	}
	path := fmt.Sprintf("/api/admin/vehicles/%d", v.ID)
	if code := call(t, srv, "PUT", path, admin, map[string]any{"plate": "20-0001 นฐ", "kind": "van", "seatCount": 11}, &e); code != 409 || e.Error.Code != "SEATS_IN_USE" {
		t.Errorf("ลดที่นั่งจนชนที่จองแล้วต้องได้ 409 SEATS_IN_USE ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "PUT", path, admin, map[string]any{"plate": "20-0001 นฐ", "kind": "van", "seatCount": 12}, &v); code != 200 || v.SeatCount != 12 {
		t.Errorf("ลดเหลือ 12 ต้องได้ 200 ได้ %d %+v", code, v)
	}
	if code := call(t, srv, "DELETE", path, admin, nil, &e); code != 409 || e.Error.Code != "IN_USE" {
		t.Errorf("ลบรถที่มีรอบต้องได้ 409 IN_USE ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "PUT", "/api/admin/vehicles/9999", admin, map[string]any{"plate": "y", "kind": "van", "seatCount": 5}, nil); code != 404 {
		t.Errorf("แก้รถที่ไม่มีต้องได้ 404 ได้ %d", code)
	}
}
