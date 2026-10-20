package mw

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Logging จดแค่ method path status เวลา ไม่จด header เพราะมีตั๋ว (JWT) อยู่ในนั้น
// (ไม่ใช้ gin.Logger() เพราะมันจด query string ด้วย และหน้าตา log ไม่เหมือนเดิม)
func Logging() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next() // ให้ middleware ตัวถัดไปกับ handler ทำงานให้เสร็จก่อน แล้วค่อยกลับมาจด
		status := c.Writer.Status()
		// WebSocket ที่ต่อสำเร็จ Gin ยังจำเป็น 200 เพราะการเชื่อมต่อถูกยึดไปก่อนเขียน status เอง
		if status == http.StatusOK && c.IsWebsocket() {
			status = http.StatusSwitchingProtocols
		}
		log.Printf("%s %s %d %v", c.Request.Method, c.Request.URL.Path, status, time.Since(start).Round(time.Microsecond))
	}
}
