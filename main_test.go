package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"petfinder/auth"
	"petfinder/handler"
	"petfinder/store"
)

// เทสต์ทั้งเส้นทาง: mux → middleware → handler → ฐานข้อมูลจริง
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
	h := &handler.Handler{Store: &store.Store{Pool: pool}, Tickets: tickets}
	return routes(h, tickets), tickets
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
