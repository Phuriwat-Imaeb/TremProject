package handler

import (
	"errors"
	"net/http"
	"time"

	"petfinder/store"
)

// งานหลังบ้านของพนักงาน /api/staff/* (routes.go ครอบด่าน staff หรือ admin ไว้แล้ว)

// maxPriceBaht กันพิมพ์ศูนย์เกิน ค่าโดยสารรถทัวร์แพงสุดก็ไม่ถึงหลักหมื่น
const maxPriceBaht = 100000

// tripReq ใช้ทั้งเพิ่ม (NewTrip) และแก้ (TripPatch) ตอนแก้ไม่อ่าน routeId/vehicleId
// PriceBaht เป็น pointer: ราคา 0 บาท (รถฟรี) ส่งมาได้ ต้องแยกจาก "ไม่ได้ส่งมา"
type tripReq struct {
	RouteID   int       `json:"routeId"`
	VehicleID int       `json:"vehicleId"`
	DepartAt  time.Time `json:"departAt"` // ต้องเป็น RFC 3339 เช่น 2026-10-21T07:00:00+07:00 ไม่งั้นอ่าน JSON ไม่ออก
	PriceBaht *int      `json:"priceBaht"`
}

// checkTimeAndPrice ตรวจส่วนที่เพิ่มและแก้ใช้ร่วมกัน ผิดตอบ 400 ให้เลยแล้วคืน false
func checkTimeAndPrice(w http.ResponseWriter, req tripReq) bool {
	switch {
	case req.DepartAt.IsZero() || req.PriceBaht == nil:
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "กรุณากรอกเวลาออกและราคา")
	case *req.PriceBaht < 0 || *req.PriceBaht > maxPriceBaht:
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "ราคาต้องอยู่ระหว่าง 0–100,000 บาท")
	case !req.DepartAt.After(time.Now()):
		writeError(w, http.StatusBadRequest, "BAD_TIME", "เวลาออกต้องเป็นเวลาในอนาคต")
	default:
		return true
	}
	return false
}

// writeTripErr แปลโน้ตจาก store ที่เจอได้ตอนเพิ่ม/แก้/ยกเลิกรอบ
func writeTripErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
	case errors.Is(err, store.ErrBadRef):
		writeError(w, http.StatusBadRequest, "BAD_REF", "ไม่พบเส้นทางหรือคันรถที่เลือก")
	case errors.Is(err, store.ErrVehicleBusy):
		writeError(w, http.StatusConflict, "VEHICLE_BUSY", "รถคันนี้มีรอบออกเวลานี้อยู่แล้ว")
	case errors.Is(err, store.ErrTripClosed):
		writeError(w, http.StatusConflict, "TRIP_CLOSED", "รอบนี้ถูกยกเลิกหรือรถออกไปแล้ว")
	default:
		internal(w, err)
	}
}

// StaffListTrips  GET /api/staff/trips?routeId=&date=&page=
func (h *Handler) StaffListTrips(w http.ResponseWriter, r *http.Request) {
	f, ok := readTripFilter(w, r)
	if !ok {
		return
	}
	_, page, ok := readPaging(w, r)
	if !ok {
		return
	}
	items, total, err := h.Store.ListAllTrips(r.Context(), f, page, pageSize)
	if err != nil {
		internal(w, err)
		return
	}
	writePage(w, items, page, total)
}

// CreateTrip  POST /api/staff/trips
func (h *Handler) CreateTrip(w http.ResponseWriter, r *http.Request) {
	var req tripReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.RouteID < 1 || req.VehicleID < 1 {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "กรุณาเลือกเส้นทางและคันรถ")
		return
	}
	if !checkTimeAndPrice(w, req) {
		return
	}
	t, err := h.Store.CreateTrip(r.Context(), store.TripInput{
		RouteID: req.RouteID, VehicleID: req.VehicleID, DepartAt: req.DepartAt, PriceBaht: *req.PriceBaht,
	})
	if err != nil {
		writeTripErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// UpdateTrip  PUT /api/staff/trips/{id}  แก้ได้แค่เวลาออกและราคา
func (h *Handler) UpdateTrip(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	var req tripReq
	if !readJSON(w, r, &req) || !checkTimeAndPrice(w, req) {
		return
	}
	t, err := h.Store.UpdateTrip(r.Context(), id, req.DepartAt, *req.PriceBaht)
	if err != nil {
		writeTripErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// CancelTrip  POST /api/staff/trips/{id}/cancel  การจองทั้งรอบถูกยกเลิกไปด้วย
func (h *Handler) CancelTrip(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.CancelTrip(r.Context(), id)
	if err != nil {
		writeTripErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// TripPassengers  GET /api/staff/trips/{id}/passengers  รอบรถ + รายชื่อผู้โดยสาร
func (h *Handler) TripPassengers(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.TripByID(r.Context(), id)
	if err != nil {
		writeTripErr(w, err)
		return
	}
	items, err := h.Store.TripPassengers(r.Context(), id)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"trip": t, "items": items})
}

// StaffListVehicles  GET /api/staff/vehicles  ไว้ทำดรอปดาวน์ตอนเพิ่มรอบ
func (h *Handler) StaffListVehicles(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListVehicles(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}
