package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"petfinder/auth"
	"petfinder/store"
)

// Handler คือห้องรับใบสั่ง ถือห้องเก็บของ และเครื่องออกตั๋วไว้ใช้
type Handler struct {
	Store   *store.Store
	Tickets *auth.Issuer
}

// writeJSON ตอบกลับเป็น JSON พร้อมเลขสถานะ
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError ตอบข้อผิดพลาดหน้าตาเดียวทั้งระบบ {"error":{"code","message"}}
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

// readJSON อ่านกล่อง JSON จาก body ใส่ dst ถ้าอ่านไม่ออกจะตอบ 400 BAD_JSON ให้เลยแล้วคืน false
func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // กันคนส่งกล่องใหญ่เกิน 1 MB มาถ่วงเซิร์ฟเวอร์
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
		return false
	}
	return true
}

// internal จดรายละเอียดลง log ฝั่งเรา แต่บอกผู้ใช้แค่ว่าระบบขัดข้อง (ไม่โชว์ stack trace)
func internal(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "INTERNAL", "ระบบขัดข้อง ลองใหม่อีกครั้ง")
}

// pathID อ่านเลขจาก path เช่น /api/lost-reports/{id} ต้องเป็นเลขบวกเท่านั้น
func pathID(r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	return id, err == nil && id > 0
}
