package mw

import (
	"net/http"
	"strings"
)

// CORS บอกเบราว์เซอร์ว่าหน้าเว็บจาก origin ไหนเรียก API นี้ได้
// allowed มาจาก ALLOWED_ORIGINS เช่น http://localhost:3000,https://xxx.vercel.app
// origin ที่ไม่อยู่ในรายการจะไม่ได้ header กลับไป เบราว์เซอร์จะบล็อกเอง
func CORS(allowed []string, next http.Handler) http.Handler {
	ok := map[string]bool{}
	for _, o := range allowed {
		if o = strings.TrimSpace(o); o != "" {
			ok[o] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if ok[origin] {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Add("Vary", "Origin")
			// ต่างจากแลป: API นี้ใช้ PATCH ด้วย ถ้าไม่ใส่ เบราว์เซอร์จะบล็อกตอนเปลี่ยนสถานะประกาศ
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Max-Age", "600")
		}
		// preflight: เบราว์เซอร์ถามก่อนว่าส่งได้ไหม ตอบแค่ header แล้วจบ ไม่ต้องถึง handler
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
