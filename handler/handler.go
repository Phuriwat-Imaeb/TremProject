package handler

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"jongkookhub/auth"
	"jongkookhub/live"
	"jongkookhub/store"
)

// Handler คือห้องรับใบสั่ง ถือห้องเก็บของ เครื่องออกตั๋ว และ hub ข่าวสดไว้ใช้
type Handler struct {
	Store   *store.Store
	Tickets *auth.Issuer
	Live    *live.Hub
	// WSOrigins host ของหน้าเว็บที่ต่อ WebSocket ได้ เช่น "localhost:3000" (มาจาก ALLOWED_ORIGINS)
	WSOrigins []string
}

// ตอบ JSON ใช้ c.JSON(status, v) ของ Gin ได้เลย มันตั้ง Content-Type และแปลงเป็น JSON ให้

// writeError ตอบข้อผิดพลาดหน้าตาเดียวทั้งระบบ {"error":{"code","message"}}
func writeError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{
		"error": gin.H{"code": code, "message": message},
	})
}

// readJSON อ่านกล่อง JSON จาก body ใส่ dst ถ้าอ่านไม่ออกจะตอบ 400 BAD_JSON ให้เลยแล้วคืน false
func readJSON(c *gin.Context, dst any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20) // กันคนส่งกล่องใหญ่เกิน 1 MB มาถ่วงเซิร์ฟเวอร์
	if err := c.ShouldBindJSON(dst); err != nil {
		writeError(c, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
		return false
	}
	return true
}

// internal จดรายละเอียดลง log ฝั่งเรา แต่บอกผู้ใช้แค่ว่าระบบขัดข้อง (ไม่โชว์ stack trace)
func internal(c *gin.Context, err error) {
	log.Printf("internal error: %v", err)
	writeError(c, http.StatusInternalServerError, "INTERNAL", "ระบบขัดข้อง ลองใหม่อีกครั้ง")
}

// pageSize จำนวนรายการต่อหน้าของทุกหน้ารายการที่แบ่งหน้า
const pageSize = 10

// readPaging อ่าน ?q=คำค้น&page=เลขหน้า ของหน้ารายการ (ไม่ส่ง page = หน้า 1)
// ผิดรูปตอบ 400 BAD_FILTER ให้เลยแล้วคืน ok = false
func readPaging(c *gin.Context) (q string, page int, ok bool) {
	q = strings.TrimSpace(c.Query("q"))
	page = 1
	if p := c.Query("page"); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil || n < 1 || n > 10000 {
			writeError(c, http.StatusBadRequest, "BAD_FILTER", "เลขหน้าต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป")
			return "", 0, false
		}
		page = n
	}
	if utf8.RuneCountInString(q) > 100 {
		writeError(c, http.StatusBadRequest, "BAD_FILTER", "คำค้นยาวได้ไม่เกิน 100 ตัวอักษร")
		return "", 0, false
	}
	return q, page, true
}

// writePage ตอบรายการแบบแบ่งหน้า {"items", "page", "pageSize", "total"}
func writePage(c *gin.Context, items any, page, total int) {
	c.JSON(http.StatusOK, map[string]any{"items": items, "page": page, "pageSize": pageSize, "total": total})
}

// pathID อ่านเลขจาก path เช่น /api/trips/:id ต้องเป็นเลขบวกเท่านั้น
func pathID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	return id, err == nil && id > 0
}
