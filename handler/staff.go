package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"jongkookhub/store"
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
func checkTimeAndPrice(c *gin.Context, req tripReq) bool {
	switch {
	case req.DepartAt.IsZero() || req.PriceBaht == nil:
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "กรุณากรอกเวลาออกและราคา")
	case *req.PriceBaht < 0 || *req.PriceBaht > maxPriceBaht:
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "ราคาต้องอยู่ระหว่าง 0–100,000 บาท")
	case !req.DepartAt.After(time.Now()):
		writeError(c, http.StatusBadRequest, "BAD_TIME", "เวลาออกต้องเป็นเวลาในอนาคต")
	default:
		return true
	}
	return false
}

// writeTripErr แปลโน้ตจาก store ที่เจอได้ตอนเพิ่ม/แก้/ยกเลิกรอบ
func writeTripErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
	case errors.Is(err, store.ErrBadRef):
		writeError(c, http.StatusBadRequest, "BAD_REF", "ไม่พบเส้นทางหรือคันรถที่เลือก")
	case errors.Is(err, store.ErrVehicleBusy):
		writeError(c, http.StatusConflict, "VEHICLE_BUSY", "รถคันนี้มีรอบออกเวลานี้อยู่แล้ว")
	case errors.Is(err, store.ErrTripClosed):
		writeError(c, http.StatusConflict, "TRIP_CLOSED", "รอบนี้ถูกยกเลิกหรือรถออกไปแล้ว")
	default:
		internal(c, err)
	}
}

// StaffListTrips  GET /api/staff/trips?routeId=&date=&page=
func (h *Handler) StaffListTrips(c *gin.Context) {
	f, ok := readTripFilter(c)
	if !ok {
		return
	}
	_, page, ok := readPaging(c)
	if !ok {
		return
	}
	items, total, err := h.Store.ListAllTrips(c.Request.Context(), f, page, pageSize)
	if err != nil {
		internal(c, err)
		return
	}
	writePage(c, items, page, total)
}

// CreateTrip  POST /api/staff/trips
func (h *Handler) CreateTrip(c *gin.Context) {
	var req tripReq
	if !readJSON(c, &req) {
		return
	}
	if req.RouteID < 1 || req.VehicleID < 1 {
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "กรุณาเลือกเส้นทางและคันรถ")
		return
	}
	if !checkTimeAndPrice(c, req) {
		return
	}
	t, err := h.Store.CreateTrip(c.Request.Context(), store.TripInput{
		RouteID: req.RouteID, VehicleID: req.VehicleID, DepartAt: req.DepartAt, PriceBaht: *req.PriceBaht,
	})
	if err != nil {
		writeTripErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

// UpdateTrip  PUT /api/staff/trips/{id}  แก้ได้แค่เวลาออกและราคา
func (h *Handler) UpdateTrip(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	var req tripReq
	if !readJSON(c, &req) || !checkTimeAndPrice(c, req) {
		return
	}
	t, err := h.Store.UpdateTrip(c.Request.Context(), id, req.DepartAt, *req.PriceBaht)
	if err != nil {
		writeTripErr(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// CancelTrip  POST /api/staff/trips/{id}/cancel  การจองทั้งรอบถูกยกเลิกไปด้วย
func (h *Handler) CancelTrip(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.CancelTrip(c.Request.Context(), id)
	if err != nil {
		writeTripErr(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
	h.notifyClosed(id) // คนที่เปิดผังรอบนี้อยู่ต้องรู้ว่าจองไม่ได้แล้ว ไม่ใช่เห็นแค่ว่าที่นั่งว่างหมด
}

// TripPassengers  GET /api/staff/trips/{id}/passengers  รอบรถ + รายชื่อผู้โดยสาร
func (h *Handler) TripPassengers(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.TripByID(c.Request.Context(), id)
	if err != nil {
		writeTripErr(c, err)
		return
	}
	items, err := h.Store.TripPassengers(c.Request.Context(), id)
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, map[string]any{"trip": t, "items": items})
}

// StaffListVehicles  GET /api/staff/vehicles  ไว้ทำดรอปดาวน์ตอนเพิ่มรอบ
func (h *Handler) StaffListVehicles(c *gin.Context) {
	items, err := h.Store.ListVehicles(c.Request.Context())
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, map[string]any{"items": items})
}
