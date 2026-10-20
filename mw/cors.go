package mw

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS บอกเบราว์เซอร์ว่าหน้าเว็บจาก origin ไหนเรียก API นี้ได้
// allowed มาจาก ALLOWED_ORIGINS เช่น http://localhost:3000,https://xxx.vercel.app
// origin ที่ไม่อยู่ในรายการจะไม่ได้ header กลับไป เบราว์เซอร์จะบล็อกเอง
func CORS(allowed []string) gin.HandlerFunc {
	ok := map[string]bool{}
	for _, o := range allowed {
		// เบราว์เซอร์ส่ง Origin มาโดยไม่มี / ท้าย ถ้าตั้งค่าเผลอใส่ / มา ตัดทิ้งให้ตรงกัน
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			ok[o] = true
		}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if ok[origin] {
			h := c.Writer.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Add("Vary", "Origin")
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Max-Age", "600")
		}
		// preflight: เบราว์เซอร์ถามก่อนว่าส่งได้ไหม ตอบแค่ header แล้วจบ ไม่ต้องถึง handler
		// ใช้ r.Use(...) แล้ว Gin รัน middleware นี้ให้แม้ path นั้นจะไม่มี route OPTIONS ก็ตาม
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
