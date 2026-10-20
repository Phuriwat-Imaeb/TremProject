package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"jongkookhub/auth"
	"jongkookhub/handler"
	"jongkookhub/live"
	"jongkookhub/store"
)

func init() { gin.SetMode(gin.TestMode) } // ไม่ให้ Gin พิมพ์รายการ route ทุกครั้งที่สร้าง router ในเทสต์

// เทสต์ทั้งเส้นทาง: router → middleware → handler → ฐานข้อมูลจริง
// ต้องมี DATABASE_URL ที่รัน schema.sql + seed.sql แล้ว (CI ทำให้) ไม่มีก็ข้าม
func newTestServer(t *testing.T) (http.Handler, *auth.Issuer) {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("ไม่ได้ตั้ง DATABASE_URL ข้ามเทสต์ที่ต้องใช้ฐานข้อมูล")
	}
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	tickets := &auth.Issuer{Secret: []byte("test-secret-ยาวพอสำหรับเทสต์-0123456789"), TTL: time.Hour}
	h := &handler.Handler{Store: &store.Store{Pool: pool}, Tickets: tickets, Live: live.NewHub()}
	return routes(h, tickets, nil), tickets
}

// call ยิงคำขอหนึ่งครั้ง token ว่าง = ไม่แนบตั๋ว ถ้า out ไม่ใช่ nil จะอ่าน JSON ใส่ให้
func call(t *testing.T, srv http.Handler, method, path, token string, body, out any) int {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if out != nil {
		if err := json.Unmarshal(rec.Body.Bytes(), out); err != nil {
			t.Fatalf("%s %s ตอบไม่เป็น JSON: %s", method, path, rec.Body)
		}
	}
	return rec.Code
}

func TestUnknownRoute(t *testing.T) {
	srv, _ := newTestServer(t)
	var e struct{ Error struct{ Code string } }
	if code := call(t, srv, "GET", "/api/no-such-thing", "", nil, &e); code != 404 || e.Error.Code != "NOT_FOUND" {
		t.Errorf("path ที่ไม่มี ต้องได้ 404 NOT_FOUND ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "DELETE", "/api/trips", "", nil, &e); code != 405 || e.Error.Code != "METHOD_NOT_ALLOWED" {
		t.Errorf("method ผิด ต้องได้ 405 METHOD_NOT_ALLOWED ได้ %d %s", code, e.Error.Code)
	}
}

func TestArticlesCRUD(t *testing.T) {
	srv, tickets := newTestServer(t)
	// id ตาม seed.sql: 1 = admin, 3 = นิดา (member)
	admin, _ := tickets.Issue(1, "admin")
	member, _ := tickets.Issue(3, "member")

	draft := map[string]any{"title": "  ร่างจากเทสต์  ", "body": "เนื้อหา", "coverUrl": "", "published": false}

	// ด่านสิทธิ์: ไม่มีตั๋ว 401, member 403
	if code := call(t, srv, "POST", "/api/admin/articles", "", draft, nil); code != 401 {
		t.Errorf("ไม่มีตั๋ว ต้องได้ 401 ได้ %d", code)
	}
	if code := call(t, srv, "POST", "/api/admin/articles", member, draft, nil); code != 403 {
		t.Errorf("member ต้องได้ 403 ได้ %d", code)
	}

	// ตรวจข้อมูล
	var e struct{ Error struct{ Code string } }
	bad := map[string]any{"title": "   ", "body": "x"}
	if code := call(t, srv, "POST", "/api/admin/articles", admin, bad, &e); code != 400 || e.Error.Code != "MISSING_FIELD" {
		t.Errorf("หัวข้อว่าง ต้องได้ 400 MISSING_FIELD ได้ %d %s", code, e.Error.Code)
	}
	bad = map[string]any{"title": "x", "body": "x", "coverUrl": "javascript:alert(1)"}
	if code := call(t, srv, "POST", "/api/admin/articles", admin, bad, nil); code != 400 {
		t.Errorf("ลิงก์รูป javascript: ต้องได้ 400 ได้ %d", code)
	}

	// สร้างฉบับร่าง
	var a store.Article
	if code := call(t, srv, "POST", "/api/admin/articles", admin, draft, &a); code != 201 {
		t.Fatalf("สร้าง ต้องได้ 201 ได้ %d", code)
	}
	if a.Title != "ร่างจากเทสต์" || a.CoverURL != nil || a.Author.ID != 1 {
		t.Errorf("ต้องตัดช่องว่าง เก็บรูปว่างเป็น null และคนเขียนคือเจ้าของตั๋ว ได้ %+v", a)
	}
	one := fmt.Sprintf("/api/articles/%d", a.ID)
	adminOne := fmt.Sprintf("/api/admin/articles/%d", a.ID)

	// ฉบับร่าง: หน้าบ้าน 404 หลังบ้านเห็น
	if code := call(t, srv, "GET", one, "", nil, nil); code != 404 {
		t.Errorf("ฉบับร่างหน้าบ้าน ต้องได้ 404 ได้ %d", code)
	}
	if code := call(t, srv, "GET", adminOne, admin, nil, nil); code != 200 {
		t.Errorf("ฉบับร่างหลังบ้าน ต้องได้ 200 ได้ %d", code)
	}

	// แก้เป็นเผยแพร่ แล้วหน้าบ้านต้องเห็น
	draft["published"] = true
	draft["title"] = "เผยแพร่แล้ว"
	if code := call(t, srv, "PUT", adminOne, admin, draft, &a); code != 200 || !a.Published || a.Title != "เผยแพร่แล้ว" {
		t.Errorf("แก้ไข ต้องได้ 200 และ published = true ได้ %d %+v", code, a)
	}
	var pub store.Article
	if code := call(t, srv, "GET", one, "", nil, &pub); code != 200 || pub.Author.Phone != nil {
		t.Errorf("หน้าบ้านต้องได้ 200 และไม่เห็นเบอร์โทรคนเขียน ได้ %d %v", code, pub.Author.Phone)
	}
	var list struct{ Items []store.Article }
	call(t, srv, "GET", "/api/articles", "", nil, &list)
	for _, it := range list.Items {
		if !it.Published {
			t.Errorf("รายการหน้าบ้านต้องไม่มีฉบับร่าง เจอ id %d", it.ID)
		}
	}

	// id ผิดรูป / ไม่มี
	if code := call(t, srv, "PUT", "/api/admin/articles/abc", admin, draft, nil); code != 400 {
		t.Errorf("id ไม่ใช่ตัวเลข ต้องได้ 400 ได้ %d", code)
	}
	if code := call(t, srv, "PUT", "/api/admin/articles/999999999", admin, draft, nil); code != 404 {
		t.Errorf("id ที่ไม่มี ต้องได้ 404 ได้ %d", code)
	}

	// ลบ ครั้งที่สองต้อง 404
	if code := call(t, srv, "DELETE", adminOne, admin, nil, nil); code != 204 {
		t.Errorf("ลบ ต้องได้ 204 ได้ %d", code)
	}
	if code := call(t, srv, "DELETE", adminOne, admin, nil, nil); code != 404 {
		t.Errorf("ลบซ้ำ ต้องได้ 404 ได้ %d", code)
	}
}

func TestArticlesSearchAndPaging(t *testing.T) {
	srv, tickets := newTestServer(t)
	admin, _ := tickets.Issue(1, "admin")

	// สร้าง 12 เรื่องที่มีคำเฉพาะ ค้นด้วยคำนี้แล้วต้องเจอแค่ 12 เรื่องนี้ (ลบทิ้งตอนจบ)
	mark := fmt.Sprintf("ทดสอบแบ่งหน้า-%d", time.Now().UnixNano())
	for i := 1; i <= 12; i++ {
		var a store.Article
		in := map[string]any{"title": fmt.Sprintf("%s เรื่องที่ %d", mark, i), "body": "50% off", "published": true}
		if code := call(t, srv, "POST", "/api/admin/articles", admin, in, &a); code != 201 {
			t.Fatalf("สร้างเรื่องที่ %d ได้ %d", i, code)
		}
		t.Cleanup(func() { call(t, srv, "DELETE", fmt.Sprintf("/api/admin/articles/%d", a.ID), admin, nil, nil) })
	}

	type page struct {
		Items                 []store.Article
		Page, PageSize, Total int
	}
	var p page
	q := "/api/articles?q=" + url.QueryEscape(mark)
	if code := call(t, srv, "GET", q, "", nil, &p); code != 200 || p.Total != 12 || len(p.Items) != 10 || p.Page != 1 || p.PageSize != 10 {
		t.Errorf("หน้า 1 ต้องได้ 10 จากทั้งหมด 12 ได้ %d total=%d items=%d", code, p.Total, len(p.Items))
	}
	if p.Items[0].Title != mark+" เรื่องที่ 12" {
		t.Errorf("ต้องเรียงใหม่สุดก่อน ได้ %q", p.Items[0].Title)
	}
	if call(t, srv, "GET", q+"&page=2", "", nil, &p); len(p.Items) != 2 || p.Page != 2 {
		t.Errorf("หน้า 2 ต้องเหลือ 2 เรื่อง ได้ %d", len(p.Items))
	}
	if call(t, srv, "GET", q+"&page=3", "", nil, &p); len(p.Items) != 0 || p.Total != 12 {
		t.Errorf("เกินหน้าสุดท้ายต้องได้รายการว่าง แต่ total ยังเป็น 12 ได้ %d %d", len(p.Items), p.Total)
	}

	// % ในคำค้นต้องหาตัวอักษร % จริง ไม่ใช่ wildcard ที่เจอทุกแถว
	if call(t, srv, "GET", q+url.QueryEscape(" เรื่องที่ 1%"), "", nil, &p); p.Total != 0 {
		t.Errorf(`ค้น "1%%" ต้องไม่เจอ (ไม่มีหัวข้อไหนมี %%) ได้ %d`, p.Total)
	}

	for _, bad := range []string{"page=0", "page=abc", "q=" + strings.Repeat("ก", 101)} {
		var e struct{ Error struct{ Code string } }
		if code := call(t, srv, "GET", "/api/articles?"+bad, "", nil, &e); code != 400 || e.Error.Code != "BAD_FILTER" {
			t.Errorf("%s ต้องได้ 400 BAD_FILTER ได้ %d %s", bad, code, e.Error.Code)
		}
	}
}

func TestAdminMembers(t *testing.T) {
	srv, tickets := newTestServer(t)
	// id ตาม seed.sql: 1 = admin, 3 = นิดา (member)
	admin, _ := tickets.Issue(1, "admin")
	member, _ := tickets.Issue(3, "member")

	var list struct{ Items []store.Member }
	if code := call(t, srv, "GET", "/api/admin/members", admin, nil, &list); code != 200 || len(list.Items) < 4 || list.Items[0].ID != 1 {
		t.Errorf("admin ต้องเห็นสมาชิกทั้งหมด เรียงตาม id ได้ %d %d คน", code, len(list.Items))
	}
	if code := call(t, srv, "GET", "/api/admin/members", member, nil, nil); code != 403 {
		t.Errorf("member ต้องได้ 403 ได้ %d", code)
	}

	var e struct{ Error struct{ Code string } }
	if code := call(t, srv, "PUT", "/api/admin/members/1/role", admin, map[string]string{"role": "member"}, &e); code != 409 || e.Error.Code != "CANNOT_CHANGE_SELF" {
		t.Errorf("เปลี่ยนบทบาทตัวเอง ต้องได้ 409 CANNOT_CHANGE_SELF ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "PUT", "/api/admin/members/3/role", admin, map[string]string{"role": "king"}, &e); code != 400 || e.Error.Code != "BAD_STATUS" {
		t.Errorf("บทบาทที่ไม่มี ต้องได้ 400 BAD_STATUS ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "PUT", "/api/admin/members/999999999/role", admin, map[string]string{"role": "member"}, nil); code != 404 {
		t.Errorf("id ที่ไม่มี ต้องได้ 404 ได้ %d", code)
	}

	var m store.Member
	if code := call(t, srv, "PUT", "/api/admin/members/3/role", admin, map[string]string{"role": "staff"}, &m); code != 200 || m.Role != "staff" {
		t.Errorf("เปลี่ยนเป็น staff ต้องได้ 200 ได้ %d %+v", code, m)
	}
	// คืนค่าเดิม เทสต์อื่นและ seed จะได้ไม่เพี้ยน
	call(t, srv, "PUT", "/api/admin/members/3/role", admin, map[string]string{"role": "member"}, nil)
}

func TestRoutesAndTrips(t *testing.T) {
	srv, _ := newTestServer(t)

	var routes struct{ Items []store.Route }
	if code := call(t, srv, "GET", "/api/routes", "", nil, &routes); code != 200 || len(routes.Items) != 4 || routes.Items[0].ID != 1 {
		t.Errorf("ต้องได้ 4 เส้นทาง เรียงตาม id ได้ %d %+v", code, routes.Items)
	}

	// seed.sql คิดเวลาออกจาก "วันนี้" ตามเวลาไทย พรุ่งนี้บนเส้นทาง 1 มีรอบ 1 (07:00) และ 2 (09:00)
	// รอบ 6 ถูกยกเลิก รอบ 7 ออกไปเมื่อวาน ต้องไม่โผล่
	tomorrow := time.Now().In(time.FixedZone("ICT", 7*3600)).AddDate(0, 0, 1).Format(time.DateOnly)
	var list struct{ Items []store.Trip }
	if code := call(t, srv, "GET", "/api/trips?routeId=1&date="+tomorrow, "", nil, &list); code != 200 || len(list.Items) != 2 {
		t.Fatalf("พรุ่งนี้เส้นทาง 1 ต้องมี 2 รอบ ได้ %d %d รอบ", code, len(list.Items))
	}
	first := list.Items[0]
	if first.ID != 1 || list.Items[1].ID != 2 {
		t.Errorf("ต้องเรียงตามเวลาออก ได้ id %d, %d", first.ID, list.Items[1].ID)
	}
	// รอบ 1 รถตู้ 13 ที่ จองไปแล้ว 3 ที่ (นิดา 1,2 ต้น 5)
	if first.SeatsLeft != 10 || first.Vehicle.Kind != "van" || first.Route.Destination != "นครปฐม" || first.Departed {
		t.Errorf("รายละเอียดรอบ 1 ไม่ตรง seed: %+v", first)
	}
	if got := first.ArriveAt.Sub(first.DepartAt); got != time.Hour {
		t.Errorf("arriveAt ต้องเท่ากับเวลาออก + 60 นาที ได้ห่างกัน %v", got)
	}

	// ไม่ส่งตัวกรอง = ทุกรอบที่ยังจองได้ คือรอบ 1–5
	if code := call(t, srv, "GET", "/api/trips", "", nil, &list); code != 200 || len(list.Items) != 5 {
		t.Errorf("ไม่กรอง ต้องได้ 5 รอบ ได้ %d %d รอบ", code, len(list.Items))
	}
	for _, bad := range []string{"routeId=abc", "routeId=0", "routeId=99999", "date=2026-13-01", "date=21-10-2026"} {
		var e struct{ Error struct{ Code string } }
		if code := call(t, srv, "GET", "/api/trips?"+bad, "", nil, &e); code != 400 || e.Error.Code != "BAD_FILTER" {
			t.Errorf("%s ต้องได้ 400 BAD_FILTER ได้ %d %s", bad, code, e.Error.Code)
		}
	}

	// รอบที่ออกไปแล้วยังเปิดดูทีละรอบได้ (หน้าตั๋วย้อนหลัง)
	var past store.Trip
	if code := call(t, srv, "GET", "/api/trips/7", "", nil, &past); code != 200 || !past.Departed {
		t.Errorf("รอบ 7 ต้องได้ 200 และ departed = true ได้ %d %+v", code, past)
	}
	if code := call(t, srv, "GET", "/api/trips/999999", "", nil, nil); code != 404 {
		t.Errorf("รอบที่ไม่มี ต้องได้ 404 ได้ %d", code)
	}
	if code := call(t, srv, "GET", "/api/trips/abc", "", nil, nil); code != 400 {
		t.Errorf("id ไม่ใช่ตัวเลข ต้องได้ 400 ได้ %d", code)
	}
}

func TestTripSeats(t *testing.T) {
	srv, _ := newTestServer(t)

	var m store.SeatMap
	if code := call(t, srv, "GET", "/api/trips/1/seats", "", nil, &m); code != 200 ||
		m.Kind != "van" || m.SeatCount != 13 || fmt.Sprint(m.Taken) != "[1 2 5]" {
		t.Errorf("รอบ 1 ต้องไม่ว่าง [1 2 5] ได้ %d %+v", code, m)
	}
	// รอบ 5 ที่นั่ง 12 ถูกยกเลิกแล้ว ต้องว่าง และต้องได้ [] ไม่ใช่ null
	var raw map[string]any
	if code := call(t, srv, "GET", "/api/trips/5/seats", "", nil, &raw); code != 200 || fmt.Sprint(raw["taken"]) != "[]" {
		t.Errorf("รอบ 5 ต้องได้ taken = [] ได้ %d %v", code, raw["taken"])
	}
	if code := call(t, srv, "GET", "/api/trips/999999/seats", "", nil, nil); code != 404 {
		t.Errorf("รอบที่ไม่มี ต้องได้ 404 ได้ %d", code)
	}
}

// dbExec สั่ง SQL ตรง ๆ ไว้เก็บกวาดข้อมูลที่เทสต์สร้าง (การจองยังไม่มี API ลบ)
func dbExec(t *testing.T, sql string, args ...any) {
	t.Helper()
	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(err)
	}
}

func TestCreateBooking(t *testing.T) {
	srv, tickets := newTestServer(t)
	ton, _ := tickets.Issue(4, "member") // id ตาม seed.sql: 4 = ต้น

	// จองรอบ 2 (รถตู้ 13 ที่ ราคา 80 ยังไม่มีใครจอง) ส่งเลขสลับกันมา ต้องเรียงให้
	var b store.Booking
	if code := call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": 2, "seats": []int{4, 3}}, &b); code != 201 {
		t.Fatalf("จองต้องได้ 201 ได้ %d", code)
	}
	t.Cleanup(func() { dbExec(t, `DELETE FROM bookings WHERE id = $1`, b.ID) })
	if fmt.Sprint(b.Seats) != "[3 4]" || b.TotalBaht != 160 || b.Status != "confirmed" || b.Trip.ID != 2 || b.Trip.SeatsLeft != 11 {
		t.Errorf("การจองที่ได้ไม่ตรง: %+v", b)
	}
	var m store.SeatMap
	call(t, srv, "GET", "/api/trips/2/seats", "", nil, &m)
	if fmt.Sprint(m.Taken) != "[3 4]" {
		t.Errorf("จองแล้วผังต้องไม่ว่าง [3 4] ได้ %v", m.Taken)
	}

	cases := []struct {
		name  string
		token string
		body  any
		code  int
		err   string
		msg   string
	}{
		{"ไม่มีตั๋ว", "", map[string]any{"tripId": 2, "seats": []int{5}}, 401, "LOGIN_REQUIRED", ""},
		{"ไม่ส่งรอบ", ton, map[string]any{"seats": []int{5}}, 400, "MISSING_FIELD", ""},
		{"ไม่เลือกที่นั่ง", ton, map[string]any{"tripId": 2, "seats": []int{}}, 400, "BAD_SEATS", ""},
		{"เลขซ้ำ", ton, map[string]any{"tripId": 2, "seats": []int{5, 5}}, 400, "BAD_SEATS", ""},
		{"เลขศูนย์", ton, map[string]any{"tripId": 2, "seats": []int{0}}, 400, "BAD_SEATS", ""},
		{"เกิน 10 ที่", ton, map[string]any{"tripId": 2, "seats": []int{1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13}}, 400, "BAD_SEATS", ""},
		{"เกินที่นั่งของรถ", ton, map[string]any{"tripId": 2, "seats": []int{14}}, 400, "BAD_SEATS", "รถคันนี้มีที่นั่ง 1–13"},
		{"มีคนจองแล้ว", ton, map[string]any{"tripId": 1, "seats": []int{3, 2, 1}}, 409, "SEAT_TAKEN", "ที่นั่ง 1, 2 มีคนจองแล้ว"},
		{"รอบถูกยกเลิก", ton, map[string]any{"tripId": 6, "seats": []int{1}}, 409, "TRIP_CLOSED", ""},
		{"รถออกไปแล้ว", ton, map[string]any{"tripId": 7, "seats": []int{1}}, 409, "TRIP_CLOSED", ""},
		{"ไม่มีรอบนี้", ton, map[string]any{"tripId": 999999, "seats": []int{1}}, 404, "NOT_FOUND", ""},
	}
	for _, c := range cases {
		var e struct {
			Error struct{ Code, Message string }
		}
		code := call(t, srv, "POST", "/api/bookings", c.token, c.body, &e)
		if code != c.code || e.Error.Code != c.err || (c.msg != "" && e.Error.Message != c.msg) {
			t.Errorf("%s: ต้องได้ %d %s %q ได้ %d %s %q", c.name, c.code, c.err, c.msg, code, e.Error.Code, e.Error.Message)
		}
	}
	// ที่นั่ง 3 ของรอบ 1 ว่างอยู่ แต่จองพร้อม 1, 2 ที่ไม่ว่าง → ต้องไม่ถูกจองไปด้วย (ทั้งหมดหรือไม่เลย)
	call(t, srv, "GET", "/api/trips/1/seats", "", nil, &m)
	if fmt.Sprint(m.Taken) != "[1 2 5]" {
		t.Errorf("จองไม่สำเร็จต้องไม่มีที่นั่งไหนถูกจองค้าง ได้ %v", m.Taken)
	}
}

// ★ 10 คนกดจองที่นั่งเดียวกันพร้อมกัน ต้องสำเร็จคนเดียว ที่เหลือได้ 409 SEAT_TAKEN
func TestCreateBookingRace(t *testing.T) {
	srv, tickets := newTestServer(t)
	ton, _ := tickets.Issue(4, "member")

	const n = 10
	codes := make([]int, n)
	var wg sync.WaitGroup
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			codes[i] = call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": 3, "seats": []int{9}}, nil)
		}()
	}
	wg.Wait()
	t.Cleanup(func() { dbExec(t, `DELETE FROM bookings WHERE trip_id = 3`) })

	won, lost := 0, 0
	for _, c := range codes {
		switch c {
		case 201:
			won++
		case 409:
			lost++
		}
	}
	if won != 1 || lost != n-1 {
		t.Errorf("ต้องสำเร็จ 1 คน ได้ 409 อีก %d คน ได้ %v", n-1, codes)
	}
}

func TestGetBooking(t *testing.T) {
	srv, tickets := newTestServer(t)
	nida, _ := tickets.Issue(3, "member")
	ton, _ := tickets.Issue(4, "member")
	staff, _ := tickets.Issue(2, "staff")

	// การจอง 1 ใน seed เป็นของนิดา ที่นั่ง 1, 2 รอบ 1
	var b store.Booking
	if code := call(t, srv, "GET", "/api/bookings/1", nida, nil, &b); code != 200 || fmt.Sprint(b.Seats) != "[1 2]" || b.Trip.ID != 1 {
		t.Errorf("เจ้าของต้องเห็นการจองของตัวเอง ได้ %d %+v", code, b)
	}
	if code := call(t, srv, "GET", "/api/bookings/1", staff, nil, nil); code != 200 {
		t.Errorf("staff ต้องดูได้ ได้ %d", code)
	}
	if code := call(t, srv, "GET", "/api/bookings/1", ton, nil, nil); code != 404 {
		t.Errorf("ของคนอื่นต้องได้ 404 ได้ %d", code)
	}
	if code := call(t, srv, "GET", "/api/bookings/1", "", nil, nil); code != 401 {
		t.Errorf("ไม่มีตั๋วต้องได้ 401 ได้ %d", code)
	}
	// ยกเลิกแล้วยังเห็นที่นั่งเดิม (ประวัติ) และ cancelledAt มีค่า
	if code := call(t, srv, "GET", "/api/bookings/3", ton, nil, &b); code != 200 || b.Status != "cancelled" || b.CancelledAt == nil || fmt.Sprint(b.Seats) != "[12]" {
		t.Errorf("การจองที่ยกเลิกแล้วไม่ตรง: %d %+v", code, b)
	}
}

func TestMyBookings(t *testing.T) {
	srv, tickets := newTestServer(t)
	nida, _ := tickets.Issue(3, "member")

	// seed: นิดามีการจอง 1 (รอบ 1) และ 4 (รอบ 7 เมื่อวาน) สร้างใน transaction เดียวกัน เวลาเท่ากัน → เรียง id มากก่อน
	var page struct {
		Items                 []store.Booking
		Page, PageSize, Total int
	}
	if code := call(t, srv, "GET", "/api/me/bookings", nida, nil, &page); code != 200 || page.Total != 2 || len(page.Items) != 2 {
		t.Fatalf("นิดาต้องมี 2 การจอง ได้ %d %+v", code, page)
	}
	if page.Items[0].ID != 4 || page.Items[1].ID != 1 || page.Items[1].Trip.Route.Destination != "นครปฐม" || !page.Items[0].Trip.Departed {
		t.Errorf("ลำดับหรือรอบรถของการจองไม่ตรง: %+v", page.Items)
	}
	if code := call(t, srv, "GET", "/api/me/bookings?page=0", nida, nil, nil); code != 400 {
		t.Errorf("page=0 ต้องได้ 400 ได้ %d", code)
	}
	if code := call(t, srv, "GET", "/api/me/bookings", "", nil, nil); code != 401 {
		t.Errorf("ไม่มีตั๋วต้องได้ 401 ได้ %d", code)
	}
}

func TestCancelBooking(t *testing.T) {
	srv, tickets := newTestServer(t)
	ton, _ := tickets.Issue(4, "member")
	nida, _ := tickets.Issue(3, "member")

	book := func() store.Booking {
		var b store.Booking
		if code := call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": 2, "seats": []int{8}}, &b); code != 201 {
			t.Fatalf("จองที่นั่ง 8 รอบ 2 ต้องได้ 201 ได้ %d", code)
		}
		t.Cleanup(func() { dbExec(t, `DELETE FROM bookings WHERE id = $1`, b.ID) })
		return b
	}
	b := book()
	path := fmt.Sprintf("/api/bookings/%d/cancel", b.ID)

	var e struct{ Error struct{ Code string } }
	if code := call(t, srv, "POST", path, nida, nil, &e); code != 404 {
		t.Errorf("ยกเลิกของคนอื่นต้องได้ 404 ได้ %d", code)
	}

	var got store.Booking
	if code := call(t, srv, "POST", path, ton, nil, &got); code != 200 || got.Status != "cancelled" || got.CancelledAt == nil || fmt.Sprint(got.Seats) != "[8]" {
		t.Fatalf("ยกเลิกต้องได้ 200 cancelled ได้ %d %+v", code, got)
	}
	var m store.SeatMap
	call(t, srv, "GET", "/api/trips/2/seats", "", nil, &m)
	if fmt.Sprint(m.Taken) != "[]" {
		t.Errorf("ยกเลิกแล้วที่นั่ง 8 ต้องว่าง ได้ %v", m.Taken)
	}
	if code := call(t, srv, "POST", path, ton, nil, &e); code != 409 || e.Error.Code != "WRONG_STATUS" {
		t.Errorf("ยกเลิกซ้ำต้องได้ 409 WRONG_STATUS ได้ %d %s", code, e.Error.Code)
	}
	book() // ที่นั่งที่ปล่อยแล้วต้องจองใหม่ได้

	// การจอง 4 ของนิดาเป็นรอบเมื่อวาน รถออกไปแล้ว
	if code := call(t, srv, "POST", "/api/bookings/4/cancel", nida, nil, &e); code != 409 || e.Error.Code != "TRIP_CLOSED" {
		t.Errorf("รถออกแล้วต้องได้ 409 TRIP_CLOSED ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "POST", "/api/bookings/999999/cancel", ton, nil, nil); code != 404 {
		t.Errorf("ไม่มีการจองนี้ต้องได้ 404 ได้ %d", code)
	}
}

func TestStaffTrips(t *testing.T) {
	srv, tickets := newTestServer(t)
	staff, _ := tickets.Issue(2, "staff") // id ตาม seed.sql: 2 = พนักงาน
	member, _ := tickets.Issue(3, "member")

	if code := call(t, srv, "GET", "/api/staff/trips", member, nil, nil); code != 403 {
		t.Errorf("member ต้องได้ 403 ได้ %d", code)
	}

	// ทุกรอบ 7 รอบ ไม่เลือกวัน = ออกล่าสุดก่อน (รอบ 6 อีก 3 วัน), เลือกวัน = เรียงตามเวลาออก
	var page struct {
		Items       []store.Trip
		Page, Total int
	}
	if code := call(t, srv, "GET", "/api/staff/trips", staff, nil, &page); code != 200 || page.Total != 7 || page.Items[0].ID != 6 {
		t.Errorf("ต้องเห็น 7 รอบ รอบ 6 ก่อน ได้ %d total=%d", code, page.Total)
	}
	tomorrow := time.Now().In(time.FixedZone("ICT", 7*3600)).AddDate(0, 0, 1).Format(time.DateOnly)
	call(t, srv, "GET", "/api/staff/trips?date="+tomorrow, staff, nil, &page)
	if ids := fmt.Sprint(tripIDs(page.Items)); ids != "[1 2 3]" {
		t.Errorf("พรุ่งนี้ต้องได้รอบ [1 2 3] เรียงตามเวลา ได้ %s", ids)
	}

	// เพิ่มรอบ: รถทัวร์ (คัน 3) อีก 5 วัน
	depart := time.Now().Add(5 * 24 * time.Hour).Truncate(time.Minute)
	newTrip := map[string]any{"routeId": 1, "vehicleId": 3, "departAt": depart, "priceBaht": 90}
	var tr store.Trip
	if code := call(t, srv, "POST", "/api/staff/trips", staff, newTrip, &tr); code != 201 || tr.SeatsLeft != 40 || tr.PriceBaht != 90 {
		t.Fatalf("เพิ่มรอบต้องได้ 201 ได้ %d %+v", code, tr)
	}
	t.Cleanup(func() {
		dbExec(t, `DELETE FROM bookings WHERE trip_id = $1`, tr.ID)
		dbExec(t, `DELETE FROM trips WHERE id = $1`, tr.ID)
	})

	bad := []struct {
		name string
		body map[string]any
		code int
		err  string
	}{
		{"รถคันเดิมเวลาเดิม", newTrip, 409, "VEHICLE_BUSY"},
		{"ไม่มีคันรถนี้", map[string]any{"routeId": 1, "vehicleId": 99, "departAt": depart, "priceBaht": 90}, 400, "BAD_REF"},
		{"เวลาในอดีต", map[string]any{"routeId": 1, "vehicleId": 3, "departAt": time.Now().Add(-time.Hour), "priceBaht": 90}, 400, "BAD_TIME"},
		{"ไม่ส่งราคา", map[string]any{"routeId": 1, "vehicleId": 3, "departAt": depart}, 400, "MISSING_FIELD"},
		{"ไม่เลือกเส้นทาง", map[string]any{"vehicleId": 3, "departAt": depart, "priceBaht": 90}, 400, "MISSING_FIELD"},
	}
	for _, c := range bad {
		var e struct{ Error struct{ Code string } }
		if code := call(t, srv, "POST", "/api/staff/trips", staff, c.body, &e); code != c.code || e.Error.Code != c.err {
			t.Errorf("%s: ต้องได้ %d %s ได้ %d %s", c.name, c.code, c.err, code, e.Error.Code)
		}
	}

	// แก้เวลา + ราคา
	later := depart.Add(30 * time.Minute)
	path := fmt.Sprintf("/api/staff/trips/%d", tr.ID)
	if code := call(t, srv, "PUT", path, staff, map[string]any{"departAt": later, "priceBaht": 100}, &tr); code != 200 || tr.PriceBaht != 100 || !tr.DepartAt.Equal(later) {
		t.Errorf("แก้รอบต้องได้ 200 ได้ %d %+v", code, tr)
	}
	var e struct{ Error struct{ Code string } }
	if code := call(t, srv, "PUT", "/api/staff/trips/7", staff, map[string]any{"departAt": later, "priceBaht": 100}, &e); code != 409 || e.Error.Code != "TRIP_CLOSED" {
		t.Errorf("แก้รอบที่ออกไปแล้วต้องได้ 409 TRIP_CLOSED ได้ %d %s", code, e.Error.Code)
	}
	if code := call(t, srv, "PUT", "/api/staff/trips/999999", staff, map[string]any{"departAt": later, "priceBaht": 100}, nil); code != 404 {
		t.Errorf("แก้รอบที่ไม่มีต้องได้ 404 ได้ %d", code)
	}

	// มีคนจองแล้ว ยกเลิกทั้งรอบ → การจองถูกยกเลิกไปด้วย ที่นั่งว่างหมด
	ton, _ := tickets.Issue(4, "member")
	var b store.Booking
	call(t, srv, "POST", "/api/bookings", ton, map[string]any{"tripId": tr.ID, "seats": []int{1, 2}}, &b)
	if code := call(t, srv, "POST", path+"/cancel", staff, nil, &tr); code != 200 || tr.Status != "cancelled" || tr.SeatsLeft != 40 {
		t.Errorf("ยกเลิกรอบต้องได้ 200 cancelled ที่นั่งว่าง 40 ได้ %d %+v", code, tr)
	}
	call(t, srv, "GET", fmt.Sprintf("/api/bookings/%d", b.ID), ton, nil, &b)
	if b.Status != "cancelled" || b.CancelledAt == nil {
		t.Errorf("การจองในรอบที่ยกเลิกต้องถูกยกเลิกไปด้วย ได้ %+v", b)
	}
	if code := call(t, srv, "POST", path+"/cancel", staff, nil, &e); code != 409 || e.Error.Code != "TRIP_CLOSED" {
		t.Errorf("ยกเลิกรอบซ้ำต้องได้ 409 TRIP_CLOSED ได้ %d %s", code, e.Error.Code)
	}
}

func tripIDs(trips []store.Trip) []int64 {
	ids := make([]int64, len(trips))
	for i, t := range trips {
		ids[i] = t.ID
	}
	return ids
}

func TestTripPassengersAndVehicles(t *testing.T) {
	srv, tickets := newTestServer(t)
	staff, _ := tickets.Issue(2, "staff")

	// รอบ 1: นิดา 1,2 และ ต้น 5 เรียงตามที่นั่งแรก
	var res struct {
		Trip  store.Trip
		Items []store.Passenger
	}
	if code := call(t, srv, "GET", "/api/staff/trips/1/passengers", staff, nil, &res); code != 200 || res.Trip.ID != 1 || len(res.Items) != 2 {
		t.Fatalf("รอบ 1 ต้องมีผู้โดยสาร 2 การจอง ได้ %d %+v", code, res)
	}
	p := res.Items[0]
	if p.Member.DisplayName != "นิดา" || p.Member.Phone == nil || fmt.Sprint(p.Seats) != "[1 2]" || fmt.Sprint(res.Items[1].Seats) != "[5]" {
		t.Errorf("รายชื่อไม่ตรง seed: %+v", res.Items)
	}
	// รอบ 5 มีแต่การจองที่ยกเลิกแล้ว ต้องได้รายชื่อว่าง
	call(t, srv, "GET", "/api/staff/trips/5/passengers", staff, nil, &res)
	if len(res.Items) != 0 {
		t.Errorf("รอบ 5 ต้องไม่มีผู้โดยสาร ได้ %+v", res.Items)
	}
	if code := call(t, srv, "GET", "/api/staff/trips/999999/passengers", staff, nil, nil); code != 404 {
		t.Errorf("รอบที่ไม่มีต้องได้ 404 ได้ %d", code)
	}

	var vs struct{ Items []store.Vehicle }
	if code := call(t, srv, "GET", "/api/staff/vehicles", staff, nil, &vs); code != 200 || len(vs.Items) != 3 || vs.Items[2].Kind != "bus" {
		t.Errorf("ต้องได้รถ 3 คัน ได้ %d %+v", code, vs.Items)
	}
}
