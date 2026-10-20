package mw

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"jongkookhub/auth"
)

var iss = &auth.Issuer{Secret: []byte("test-secret-ที่ยาวพอสำหรับการทดสอบเท่านั้น-1234"), TTL: time.Hour}

// echoWho เป็น handler ปลายทาง ตอบ id กับ role ที่ middleware ฝากมา
func echoWho(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(WhoFrom(r.Context()))
}

// call ยิงคำขอผ่าน h แล้วคืนเลขสถานะ, code ของ error (ถ้ามี) และ Who ที่ปลายทางเห็น
func call(h http.HandlerFunc, authHeader string) (int, string, Who) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	h(rec, req)

	var body struct {
		Error struct{ Code string }
		Who
	}
	json.NewDecoder(rec.Body).Decode(&body)
	return rec.Code, body.Error.Code, body.Who
}

func TestRequireLogin(t *testing.T) {
	token, _ := iss.Issue(3, "member")
	h := RequireLogin(iss, echoWho)

	cases := []struct {
		name, header, wantCode string
		wantStatus             int
	}{
		{"ไม่แนบตั๋ว", "", "LOGIN_REQUIRED", 401},
		{"ลืมคำว่า Bearer", token, "LOGIN_REQUIRED", 401},
		{"Bearer แต่ไม่มีตั๋ว", "Bearer ", "LOGIN_REQUIRED", 401},
		{"ตั๋วเสีย", "Bearer " + token + "x", "TOKEN_INVALID", 401},
		{"ตั๋วถูกต้อง", "Bearer " + token, "", 200},
	}
	for _, c := range cases {
		status, code, _ := call(h, c.header)
		if status != c.wantStatus || code != c.wantCode {
			t.Errorf("%s: ได้ %d %q อยากได้ %d %q", c.name, status, code, c.wantStatus, c.wantCode)
		}
	}

	_, _, who := call(h, "Bearer "+token)
	if who.ID != 3 || who.Role != "member" {
		t.Errorf("ปลายทางต้องรู้ว่าเป็นสมาชิก 3 member ได้ %+v", who)
	}
}

func TestOptionalLogin(t *testing.T) {
	token, _ := iss.Issue(3, "member")
	h := OptionalLogin(iss, echoWho)

	if status, _, who := call(h, ""); status != 200 || who.ID != 0 {
		t.Errorf("ไม่แนบตั๋ว ต้องผ่านแบบคนทั่วไป ได้ %d %+v", status, who)
	}
	if status, _, who := call(h, "Bearer "+token+"x"); status != 200 || who.ID != 0 {
		t.Errorf("ตั๋วเสีย ต้องผ่านแบบคนทั่วไป ได้ %d %+v", status, who)
	}
	if status, _, who := call(h, "Bearer "+token); status != 200 || who.ID != 3 {
		t.Errorf("ตั๋วถูก ต้องรู้ว่าเป็นสมาชิก 3 ได้ %d %+v", status, who)
	}
}

func TestRequireRole(t *testing.T) {
	h := RequireLogin(iss, RequireRole(echoWho, "staff", "admin"))

	for role, want := range map[string]int{"member": 403, "staff": 200, "admin": 200} {
		token, _ := iss.Issue(1, role)
		status, _, _ := call(h, "Bearer "+token)
		if status != want {
			t.Errorf("role %s: ได้ %d อยากได้ %d", role, status, want)
		}
	}
}

func TestCORS(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusTeapot) })
	h := CORS([]string{"http://localhost:3000", "", " https://x.vercel.app/"}, next)

	preflight := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, "/api/lost-reports/1", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "PATCH")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	rec := preflight("http://localhost:3000")
	if rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("origin ที่อนุญาต ต้องได้ 204 พร้อม header ได้ %d %v", rec.Code, rec.Header())
	}
	if m := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(m, "PATCH") {
		t.Errorf("ต้องอนุญาต PATCH ได้ %q", m)
	}

	// ตั้งค่ามีช่องว่างกับ / ท้าย ก็ยังต้องตรงกับ Origin ที่เบราว์เซอร์ส่งมา
	if rec = preflight("https://x.vercel.app"); rec.Header().Get("Access-Control-Allow-Origin") != "https://x.vercel.app" {
		t.Error("origin ที่ตั้งค่าไว้มี / ท้าย ต้องยังได้ header")
	}

	rec = preflight("http://evil.example")
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("origin ที่ไม่อนุญาต ต้องไม่ได้ header")
	}

	// คำขอที่ไม่ใช่ OPTIONS ต้องส่งต่อไปถึง handler
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTeapot {
		t.Errorf("GET ต้องถึง handler ได้ %d", rec.Code)
	}
}
