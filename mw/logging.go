package mw

import (
	"bufio"
	"log"
	"net"
	"net/http"
	"time"
)

// recorder แอบจดเลขสถานะที่ handler ตอบ เพื่อเอาไปเขียน log
type recorder struct {
	http.ResponseWriter
	status int
}

func (r *recorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Hijack ส่งต่อให้ ResponseWriter ตัวจริง: WebSocket ต้องยึดการเชื่อมต่อ TCP ไปใช้เอง
// ถ้า recorder ไม่มีเมธอดนี้ library WebSocket จะมองไม่เห็นและตอบ 501 ทุกครั้ง
func (r *recorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	r.status = http.StatusSwitchingProtocols // log จะได้เห็นว่าเป็น 101 ไม่ใช่ 200
	return http.NewResponseController(r.ResponseWriter).Hijack()
}

// Logging จดแค่ method path status เวลา ไม่จด header เพราะมีตั๋ว (JWT) อยู่ในนั้น
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &recorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %v", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Microsecond))
	})
}
