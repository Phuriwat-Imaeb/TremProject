package mw

import (
	"net/http"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"

	"jongkookhub/auth"
)

// Who คือข้อมูลจากตั๋วที่ตรวจแล้ว ID เป็น 0 แปลว่าไม่ได้ล็อกอิน
type Who struct {
	ID   int64
	Role string
}

// whoKey ชื่อช่องที่ฝาก Who ไว้ใน gin.Context (c.Set / c.Get)
const whoKey = "who"

// WhoFrom อ่านว่าใครเป็นคนส่งคำขอนี้ (middleware ฝากไว้ใน gin.Context)
func WhoFrom(c *gin.Context) Who {
	v, _ := c.Get(whoKey)
	w, _ := v.(Who)
	return w
}

// deny ตอบข้อผิดพลาดหน้าตาเดียวกับ handler.writeError แล้วหยุด ไม่ให้ไปถึง handler ถัดไป
// (เรียกของ handler ไม่ได้ เพราะ handler import mw อยู่แล้ว จะกลายเป็น import วนกัน)
func deny(c *gin.Context, status int, code, msg string) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": gin.H{"code": code, "message": msg},
	})
}

// bearer ดึงตั๋วจาก header "Authorization: Bearer <token>"
func bearer(c *gin.Context) (string, bool) {
	token, found := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
	return token, found && token != ""
}

// RequireLogin ด่านตรวจตั๋ว ไม่มีตั๋ว → 401 LOGIN_REQUIRED, ตั๋วปลอม/หมดอายุ → 401 TOKEN_INVALID
func RequireLogin(iss *auth.Issuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := bearer(c)
		if !ok {
			deny(c, http.StatusUnauthorized, "LOGIN_REQUIRED", "กรุณาเข้าสู่ระบบก่อน")
			return
		}
		id, role, err := iss.Parse(token)
		if err != nil {
			deny(c, http.StatusUnauthorized, "TOKEN_INVALID", "ตั๋วใช้ไม่ได้หรือหมดอายุ กรุณาเข้าสู่ระบบใหม่")
			return
		}
		c.Set(whoKey, Who{ID: id, Role: role})
		c.Next()
	}
}

// OptionalLogin ใช้กับหน้าที่ใครก็ดูได้ แต่คนล็อกอินจะเห็นมากกว่า เช่น เบอร์โทรคนเขียนบทความ
// ตั๋วเสียหรือหมดอายุก็ไม่ตอบ 401 แค่ถือว่าเป็นคนทั่วไป (WhoFrom ได้ ID = 0)
func OptionalLogin(iss *auth.Issuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		if token, ok := bearer(c); ok {
			if id, role, err := iss.Parse(token); err == nil {
				c.Set(whoKey, Who{ID: id, Role: role})
			}
		}
		c.Next()
	}
}

// RequireRole ด่านตรวจบทบาท ต้องวางไว้หลัง RequireLogin เสมอ (ต้องรู้ก่อนว่าเป็นใคร)
// รับได้หลายบทบาท เช่น RequireRole("staff", "admin") ไม่ตรงสักอัน → 403
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !slices.Contains(roles, WhoFrom(c).Role) {
			deny(c, http.StatusForbidden, "FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้")
			return
		}
		c.Next()
	}
}
