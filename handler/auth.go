package handler

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"petfinder/auth"
	"petfinder/mw"
	"petfinder/store"
)

type registerReq struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName string  `json:"displayName"`
	Phone       *string `json:"phone"`
}

// Register  POST /api/auth/register  ได้บทบาท member เสมอ ไม่รับ role จากผู้ใช้
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if !readJSON(w, r, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.DisplayName)
	switch {
	case !strings.Contains(email, "@") || len(email) > 255:
		writeError(w, http.StatusBadRequest, "BAD_EMAIL", "รูปแบบอีเมลไม่ถูกต้อง")
		return
	// ขั้นต่ำนับเป็นตัวอักษร แต่ขั้นสูงนับเป็นไบต์ เพราะ bcrypt รับได้แค่ 72 ไบต์ (อักษรไทย 1 ตัว = 3 ไบต์)
	case utf8.RuneCountInString(req.Password) < 8 || len(req.Password) > 72:
		writeError(w, http.StatusBadRequest, "BAD_PASSWORD", "รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์")
		return
	case name == "" || utf8.RuneCountInString(name) > 50:
		writeError(w, http.StatusBadRequest, "BAD_NAME", "ชื่อที่แสดงต้องยาว 1-50 ตัวอักษร")
		return
	}

	// เบอร์โทรไม่บังคับ ส่งมาว่าง ๆ ถือว่าไม่มี (เก็บเป็น NULL)
	var phone *string
	if req.Phone != nil {
		if p := strings.TrimSpace(*req.Phone); p != "" {
			phone = &p
		}
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		internal(w, err)
		return
	}
	m, err := h.Store.CreateMember(r.Context(), email, hash, name, phone)
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "EMAIL_TAKEN", "อีเมลนี้มีบัญชีอยู่แล้ว")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login  POST /api/auth/login  ตอบตั๋ว JWT + ข้อมูลสมาชิก
// อีเมลไม่มี กับรหัสผิด ตอบเหมือนกันทุกอย่าง ทั้งข้อความและเวลาที่ใช้
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if !readJSON(w, r, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	m, err := h.Store.MemberByEmail(r.Context(), email)
	if errors.Is(err, store.ErrNotFound) {
		auth.WasteTime(req.Password)
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	if !auth.CheckPassword(m.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	token, err := h.Tickets.Issue(m.ID, m.Role)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "member": m})
}

// Me  GET /api/me  ข้อมูลของเจ้าของตั๋ว (ต้องผ่าน RequireLogin มาก่อน)
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	who := mw.WhoFrom(r.Context())
	m, err := h.Store.MemberByID(r.Context(), who.ID)
	if errors.Is(err, store.ErrNotFound) {
		// ตั๋วยังไม่หมดอายุ แต่บัญชีถูกลบไปแล้ว
		writeError(w, http.StatusUnauthorized, "LOGIN_REQUIRED", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}
