package handler

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"jongkookhub/auth"
	"jongkookhub/mw"
	"jongkookhub/store"
)

// passwordOK กฎรหัสผ่านใหม่ ใช้ทั้งตอนสมัครและตอนเปลี่ยนรหัส
// ขั้นต่ำนับเป็นตัวอักษร แต่ขั้นสูงนับเป็นไบต์ เพราะ bcrypt รับได้แค่ 72 ไบต์ (อักษรไทย 1 ตัว = 3 ไบต์)
func passwordOK(p string) bool {
	return utf8.RuneCountInString(p) >= 8 && len(p) <= 72
}

const badPasswordMsg = "รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์"

type registerReq struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName string  `json:"displayName"`
	Phone       *string `json:"phone"`
}

// Register  POST /api/auth/register  ได้บทบาท member เสมอ ไม่รับ role จากผู้ใช้
func (h *Handler) Register(c *gin.Context) {
	var req registerReq
	if !readJSON(c, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.DisplayName)
	switch {
	case !strings.Contains(email, "@") || len(email) > 255:
		writeError(c, http.StatusBadRequest, "BAD_EMAIL", "รูปแบบอีเมลไม่ถูกต้อง")
		return
	case !passwordOK(req.Password):
		writeError(c, http.StatusBadRequest, "BAD_PASSWORD", badPasswordMsg)
		return
	case name == "" || utf8.RuneCountInString(name) > 50:
		writeError(c, http.StatusBadRequest, "BAD_NAME", "ชื่อที่แสดงต้องยาว 1-50 ตัวอักษร")
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
		internal(c, err)
		return
	}
	m, err := h.Store.CreateMember(c.Request.Context(), email, hash, name, phone)
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(c, http.StatusConflict, "EMAIL_TAKEN", "อีเมลนี้มีบัญชีอยู่แล้ว")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusCreated, m)
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login  POST /api/auth/login  ตอบตั๋ว JWT + ข้อมูลสมาชิก
// อีเมลไม่มี กับรหัสผิด ตอบเหมือนกันทุกอย่าง ทั้งข้อความและเวลาที่ใช้
func (h *Handler) Login(c *gin.Context) {
	var req loginReq
	if !readJSON(c, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	m, err := h.Store.MemberByEmail(c.Request.Context(), email)
	if errors.Is(err, store.ErrNotFound) {
		auth.WasteTime(req.Password)
		writeError(c, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	if !auth.CheckPassword(m.PasswordHash, req.Password) {
		writeError(c, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	token, err := h.Tickets.Issue(m.ID, m.Role)
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, map[string]any{"token": token, "member": m})
}

// Me  GET /api/me  ข้อมูลของเจ้าของตั๋ว (ต้องผ่าน RequireLogin มาก่อน)
func (h *Handler) Me(c *gin.Context) {
	who := mw.WhoFrom(c)
	m, err := h.Store.MemberByID(c.Request.Context(), who.ID)
	if errors.Is(err, store.ErrNotFound) {
		// ตั๋วยังไม่หมดอายุ แต่บัญชีถูกลบไปแล้ว
		writeError(c, http.StatusUnauthorized, "LOGIN_REQUIRED", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}

type changePasswordReq struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword  PUT /api/me/password  ต้องใส่รหัสเดิมให้ถูกก่อน กันคนที่แอบใช้เครื่องที่ login ค้างไว้
// รหัสเดิมผิดตอบ 400 ไม่ใช่ 401 เพราะตั๋วยังถูกต้อง (หน้าเว็บเห็น 401 จะพาออกจากระบบ)
// ตั๋วใบเดิมยังใช้ได้จนหมดอายุ เพราะ Go ไม่ได้จดว่าออกตั๋วใบไหนไปแล้ว (ข้อแลกเดียวกับการเปลี่ยนบทบาท)
func (h *Handler) ChangePassword(c *gin.Context) {
	var req changePasswordReq
	if !readJSON(c, &req) {
		return
	}
	if !passwordOK(req.NewPassword) {
		writeError(c, http.StatusBadRequest, "BAD_PASSWORD", badPasswordMsg)
		return
	}
	if req.NewPassword == req.CurrentPassword {
		writeError(c, http.StatusBadRequest, "SAME_PASSWORD", "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม")
		return
	}

	ctx := c.Request.Context()
	who := mw.WhoFrom(c)
	hash, err := h.Store.PasswordHashByID(ctx, who.ID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusUnauthorized, "LOGIN_REQUIRED", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	if !auth.CheckPassword(hash, req.CurrentPassword) {
		writeError(c, http.StatusBadRequest, "WRONG_PASSWORD", "รหัสผ่านเดิมไม่ถูกต้อง")
		return
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		internal(c, err)
		return
	}
	if err := h.Store.SetPasswordHash(ctx, who.ID, newHash); err != nil {
		internal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
