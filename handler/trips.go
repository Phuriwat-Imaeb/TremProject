package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"jongkookhub/store"
)

// readTripFilter อ่าน ?routeId=&date=YYYY-MM-DD ผิดรูปตอบ 400 BAD_FILTER ให้เลยแล้วคืน ok = false
func readTripFilter(c *gin.Context) (f store.TripFilter, ok bool) {
	if s := c.Query("routeId"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 || n > 32767 { // routes.id เป็น SMALLINT
			writeError(c, http.StatusBadRequest, "BAD_FILTER", "routeId ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป")
			return f, false
		}
		f.RouteID = n
	}
	if s := c.Query("date"); s != "" {
		// ตรวจด้วย time.Parse ก่อน ไม่ส่งของแปลก ๆ อย่าง 2026-13-40 ไปให้ฐานข้อมูลพัง
		if _, err := time.Parse(time.DateOnly, s); err != nil {
			writeError(c, http.StatusBadRequest, "BAD_FILTER", "date ต้องเป็นรูปแบบ YYYY-MM-DD")
			return f, false
		}
		f.Date = &s
	}
	return f, true
}

// ListTrips  GET /api/trips  รอบที่ยังจองได้ กรองตามเส้นทาง/วันที่
func (h *Handler) ListTrips(c *gin.Context) {
	f, ok := readTripFilter(c)
	if !ok {
		return
	}
	items, err := h.Store.ListOpenTrips(c.Request.Context(), f)
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, map[string]any{"items": items})
}

// GetTrip  GET /api/trips/{id}
func (h *Handler) GetTrip(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.TripByID(c.Request.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// TripSeats  GET /api/trips/{id}/seats  ผังที่นั่ง
func (h *Handler) TripSeats(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	m, err := h.Store.TripSeats(c.Request.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, m)
}
