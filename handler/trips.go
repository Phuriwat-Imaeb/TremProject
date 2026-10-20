package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"jongkookhub/store"
)

// readTripFilter อ่าน ?routeId=&date=YYYY-MM-DD ผิดรูปตอบ 400 BAD_FILTER ให้เลยแล้วคืน ok = false
func readTripFilter(w http.ResponseWriter, r *http.Request) (f store.TripFilter, ok bool) {
	if s := r.URL.Query().Get("routeId"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 || n > 32767 { // routes.id เป็น SMALLINT
			writeError(w, http.StatusBadRequest, "BAD_FILTER", "routeId ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป")
			return f, false
		}
		f.RouteID = n
	}
	if s := r.URL.Query().Get("date"); s != "" {
		// ตรวจด้วย time.Parse ก่อน ไม่ส่งของแปลก ๆ อย่าง 2026-13-40 ไปให้ฐานข้อมูลพัง
		if _, err := time.Parse(time.DateOnly, s); err != nil {
			writeError(w, http.StatusBadRequest, "BAD_FILTER", "date ต้องเป็นรูปแบบ YYYY-MM-DD")
			return f, false
		}
		f.Date = &s
	}
	return f, true
}

// ListTrips  GET /api/trips  รอบที่ยังจองได้ กรองตามเส้นทาง/วันที่
func (h *Handler) ListTrips(w http.ResponseWriter, r *http.Request) {
	f, ok := readTripFilter(w, r)
	if !ok {
		return
	}
	items, err := h.Store.ListOpenTrips(r.Context(), f)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetTrip  GET /api/trips/{id}
func (h *Handler) GetTrip(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	t, err := h.Store.TripByID(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// TripSeats  GET /api/trips/{id}/seats  ผังที่นั่ง
func (h *Handler) TripSeats(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	m, err := h.Store.TripSeats(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}
