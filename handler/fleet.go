package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"jongkookhub/store"
)

// งานหลังบ้านของ admin: เส้นทาง /api/admin/routes และคันรถ /api/admin/vehicles

type routeReq struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	DurationMin int    `json:"durationMin"`
}

type vehicleReq struct {
	Plate     string `json:"plate"`
	Kind      string `json:"kind"`
	SeatCount int    `json:"seatCount"`
}

// readRoute อ่านและตรวจเส้นทาง ผิดตอบ 400 ให้เลยแล้วคืน ok = false
func readRoute(c *gin.Context) (in store.RouteInput, ok bool) {
	var req routeReq
	if !readJSON(c, &req) {
		return in, false
	}
	origin, dest := strings.TrimSpace(req.Origin), strings.TrimSpace(req.Destination)
	switch {
	case origin == "" || dest == "" || utf8.RuneCountInString(origin) > 100 || utf8.RuneCountInString(dest) > 100:
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "ต้นทางและปลายทางต้องยาว 1–100 ตัวอักษร")
	case origin == dest:
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "ต้นทางกับปลายทางต้องไม่ใช่ที่เดียวกัน")
	case req.DurationMin < 1 || req.DurationMin > 2880: // ไม่เกิน 2 วัน และไม่ล้น SMALLINT
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "เวลาเดินทางต้องอยู่ระหว่าง 1–2,880 นาที")
	default:
		return store.RouteInput{Origin: origin, Destination: dest, DurationMin: int16(req.DurationMin)}, true
	}
	return in, false
}

// readVehicle อ่านและตรวจคันรถ ผิดตอบ 400 ให้เลยแล้วคืน ok = false
func readVehicle(c *gin.Context) (in store.VehicleInput, ok bool) {
	var req vehicleReq
	if !readJSON(c, &req) {
		return in, false
	}
	plate := strings.TrimSpace(req.Plate)
	switch {
	case plate == "" || utf8.RuneCountInString(plate) > 20:
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "ทะเบียนรถต้องยาว 1–20 ตัวอักษร")
	case req.Kind != "van" && req.Kind != "bus":
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "ประเภทรถต้องเป็น van หรือ bus")
	case req.SeatCount < 1 || req.SeatCount > 60: // ตรงกับ CHECK ของตาราง vehicles
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", "จำนวนที่นั่งต้องอยู่ระหว่าง 1–60")
	default:
		return store.VehicleInput{Plate: plate, Kind: req.Kind, SeatCount: int16(req.SeatCount)}, true
	}
	return in, false
}

// writeFleetErr แปลโน้ตจาก store ที่เจอได้ตอนเพิ่ม/แก้/ลบ เส้นทางหรือคันรถ
func writeFleetErr(c *gin.Context, err error) {
	var inUse store.SeatsInUseError
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
	case errors.Is(err, store.ErrDuplicate):
		writeError(c, http.StatusConflict, "DUPLICATE", "ข้อมูลนี้มีอยู่แล้ว")
	case errors.Is(err, store.ErrInUse):
		writeError(c, http.StatusConflict, "IN_USE", "มีรอบรถใช้รายการนี้อยู่ ลบไม่ได้")
	case errors.As(err, &inUse):
		writeError(c, http.StatusConflict, "SEATS_IN_USE",
			fmt.Sprintf("มีคนจองที่นั่งเลข %d ในรอบที่ยังไม่ออก ลดจำนวนที่นั่งไม่ได้", inUse.Seat))
	default:
		internal(c, err)
	}
}

// CreateRoute  POST /api/admin/routes
func (h *Handler) CreateRoute(c *gin.Context) {
	in, ok := readRoute(c)
	if !ok {
		return
	}
	rt, err := h.Store.CreateRoute(c.Request.Context(), in)
	if err != nil {
		writeFleetErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, rt)
}

// UpdateRoute  PUT /api/admin/routes/{id}
func (h *Handler) UpdateRoute(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	in, ok := readRoute(c)
	if !ok {
		return
	}
	rt, err := h.Store.UpdateRoute(c.Request.Context(), id, in)
	if err != nil {
		writeFleetErr(c, err)
		return
	}
	c.JSON(http.StatusOK, rt)
}

// DeleteRoute  DELETE /api/admin/routes/{id}
func (h *Handler) DeleteRoute(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	if err := h.Store.DeleteRoute(c.Request.Context(), id); err != nil {
		writeFleetErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// CreateVehicle  POST /api/admin/vehicles
func (h *Handler) CreateVehicle(c *gin.Context) {
	in, ok := readVehicle(c)
	if !ok {
		return
	}
	v, err := h.Store.CreateVehicle(c.Request.Context(), in)
	if err != nil {
		writeFleetErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, v)
}

// UpdateVehicle  PUT /api/admin/vehicles/{id}
func (h *Handler) UpdateVehicle(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	in, ok := readVehicle(c)
	if !ok {
		return
	}
	v, err := h.Store.UpdateVehicle(c.Request.Context(), id, in)
	if err != nil {
		writeFleetErr(c, err)
		return
	}
	c.JSON(http.StatusOK, v)
}

// DeleteVehicle  DELETE /api/admin/vehicles/{id}
func (h *Handler) DeleteVehicle(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	if err := h.Store.DeleteVehicle(c.Request.Context(), id); err != nil {
		writeFleetErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
