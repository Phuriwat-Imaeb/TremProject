package mw

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strings"

	"jongkookhub/auth"
)

// Who คือข้อมูลจากตั๋วที่ตรวจแล้ว ID เป็น 0 แปลว่าไม่ได้ล็อกอิน
type Who struct {
	ID   int64
	Role string
}

type ctxKey struct{}

// WhoFrom อ่านว่าใครเป็นคนส่งคำขอนี้ (middleware ฝากไว้ใน context)
func WhoFrom(ctx context.Context) Who {
	w, _ := ctx.Value(ctxKey{}).(Who)
	return w
}

// deny ตอบข้อผิดพลาดหน้าตาเดียวกับ handler.writeError
// (เรียกของ handler ไม่ได้ เพราะ handler import mw อยู่แล้ว จะกลายเป็น import วนกัน)
func deny(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": code, "message": msg},
	})
}

// bearer ดึงตั๋วจาก header "Authorization: Bearer <token>"
func bearer(r *http.Request) (string, bool) {
	token, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return token, found && token != ""
}

// RequireLogin ด่านตรวจตั๋ว ไม่มีตั๋ว → 401 LOGIN_REQUIRED, ตั๋วปลอม/หมดอายุ → 401 TOKEN_INVALID
func RequireLogin(iss *auth.Issuer, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearer(r)
		if !ok {
			deny(w, http.StatusUnauthorized, "LOGIN_REQUIRED", "กรุณาเข้าสู่ระบบก่อน")
			return
		}
		id, role, err := iss.Parse(token)
		if err != nil {
			deny(w, http.StatusUnauthorized, "TOKEN_INVALID", "ตั๋วใช้ไม่ได้หรือหมดอายุ กรุณาเข้าสู่ระบบใหม่")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKey{}, Who{ID: id, Role: role})
		next(w, r.WithContext(ctx))
	}
}

// OptionalLogin ใช้กับหน้าที่ใครก็ดูได้ แต่คนล็อกอินจะเห็นมากกว่า เช่น เบอร์โทรเจ้าของประกาศ
// ตั๋วเสียหรือหมดอายุก็ไม่ตอบ 401 แค่ถือว่าเป็นคนทั่วไป (WhoFrom ได้ ID = 0)
func OptionalLogin(iss *auth.Issuer, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if token, ok := bearer(r); ok {
			if id, role, err := iss.Parse(token); err == nil {
				r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, Who{ID: id, Role: role}))
			}
		}
		next(w, r)
	}
}

// RequireRole ด่านตรวจบทบาท ต้องวางไว้ข้างใน RequireLogin เสมอ (ต้องรู้ก่อนว่าเป็นใคร)
// รับได้หลายบทบาท เช่น RequireRole(h.X, "staff", "admin") ไม่ตรงสักอัน → 403
func RequireRole(next http.HandlerFunc, roles ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !slices.Contains(roles, WhoFrom(r.Context()).Role) {
			deny(w, http.StatusForbidden, "FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้")
			return
		}
		next(w, r)
	}
}
