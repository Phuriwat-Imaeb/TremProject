package handler

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"petfinder/mw"
	"petfinder/store"
)

// maxSeatsPerBooking จองได้ครั้งละไม่เกินนี้ (NewBooking.seats maxItems ใน openapi.yaml)
const maxSeatsPerBooking = 10

type bookingReq struct {
	TripID int64   `json:"tripId"`
	Seats  []int16 `json:"seats"`
}

// joinSeats [3 4 7] → "3, 4, 7" ไว้ใส่ในข้อความภาษาไทย
func joinSeats(seats []int16) string {
	parts := make([]string, len(seats))
	for i, s := range seats {
		parts[i] = fmt.Sprint(s)
	}
	return strings.Join(parts, ", ")
}

// CreateBooking  POST /api/bookings  จองที่นั่ง คนจองคือเจ้าของตั๋ว
func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	var req bookingReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.TripID < 1 {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "กรุณาเลือกรอบรถ")
		return
	}
	seats := slices.Clone(req.Seats)
	slices.Sort(seats)
	switch {
	case len(seats) == 0:
		writeError(w, http.StatusBadRequest, "BAD_SEATS", "กรุณาเลือกที่นั่งอย่างน้อย 1 ที่")
		return
	case len(seats) > maxSeatsPerBooking:
		writeError(w, http.StatusBadRequest, "BAD_SEATS", fmt.Sprintf("จองได้ครั้งละไม่เกิน %d ที่นั่ง", maxSeatsPerBooking))
		return
	case seats[0] < 1:
		writeError(w, http.StatusBadRequest, "BAD_SEATS", "เลขที่นั่งต้องตั้งแต่ 1 ขึ้นไป")
		return
	case len(slices.Compact(slices.Clone(seats))) != len(seats): // เรียงแล้ว เลขซ้ำจะอยู่ติดกัน Compact ตัดทิ้ง
		writeError(w, http.StatusBadRequest, "BAD_SEATS", "เลือกที่นั่งซ้ำกัน")
		return
	}

	b, err := h.Store.CreateBooking(r.Context(), mw.WhoFrom(r.Context()).ID, req.TripID, seats)
	var rangeErr store.SeatRangeError
	var takenErr store.SeatTakenError
	switch {
	case err == nil:
		writeJSON(w, http.StatusCreated, b)
		h.notifySeats(b.Trip.ID) // คนอื่นที่เปิดผังรอบนี้อยู่เห็นที่นั่งเหล่านี้ไม่ว่างทันที
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
	case errors.Is(err, store.ErrTripClosed):
		writeError(w, http.StatusConflict, "TRIP_CLOSED", "รอบนี้ปิดการจองแล้ว (ถูกยกเลิกหรือรถออกไปแล้ว)")
	case errors.As(err, &rangeErr):
		writeError(w, http.StatusBadRequest, "BAD_SEATS", fmt.Sprintf("รถคันนี้มีที่นั่ง 1–%d", rangeErr.SeatCount))
	case errors.As(err, &takenErr) && len(takenErr.Seats) > 0:
		writeError(w, http.StatusConflict, "SEAT_TAKEN", fmt.Sprintf("ที่นั่ง %s มีคนจองแล้ว", joinSeats(takenErr.Seats)))
	case errors.As(err, &takenErr):
		writeError(w, http.StatusConflict, "SEAT_TAKEN", "มีคนจองที่นั่งที่เลือกไปก่อนแล้ว ลองเลือกใหม่")
	default:
		internal(w, err)
	}
}

// GetBooking  GET /api/bookings/{id}  ของตัวเอง หรือ staff/admin ดูได้ทุกรายการ
func (h *Handler) GetBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	b, err := h.Store.BookingByID(r.Context(), id)
	who := mw.WhoFrom(r.Context())
	// ของคนอื่นตอบ 404 เหมือนหาไม่เจอ ไม่บอกว่ามีการจองเลขนี้อยู่
	if errors.Is(err, store.ErrNotFound) || (err == nil && b.MemberID != who.ID && who.Role != "staff" && who.Role != "admin") {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}

// MyBookings  GET /api/me/bookings?page=  การจองของเจ้าของตั๋ว ใหม่สุดก่อน
func (h *Handler) MyBookings(w http.ResponseWriter, r *http.Request) {
	_, page, ok := readPaging(w, r) // หน้านี้ไม่มีช่องค้นหา ใช้แค่เลขหน้า
	if !ok {
		return
	}
	items, total, err := h.Store.ListMemberBookings(r.Context(), mw.WhoFrom(r.Context()).ID, page, pageSize)
	if err != nil {
		internal(w, err)
		return
	}
	writePage(w, items, page, total)
}

// CancelBooking  POST /api/bookings/{id}/cancel  ยกเลิกการจองของตัวเอง ยกเลิกได้จนถึงเวลารถออก
func (h *Handler) CancelBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	b, err := h.Store.CancelBooking(r.Context(), id, mw.WhoFrom(r.Context()).ID)
	switch {
	case err == nil:
		writeJSON(w, http.StatusOK, b)
		h.notifySeats(b.Trip.ID) // ที่นั่งกลับมาว่าง คนที่เปิดผังอยู่เห็นทันที
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
	case errors.Is(err, store.ErrWrongStatus):
		writeError(w, http.StatusConflict, "WRONG_STATUS", "การจองนี้ยกเลิกไปแล้ว")
	case errors.Is(err, store.ErrTripClosed):
		writeError(w, http.StatusConflict, "TRIP_CLOSED", "รถออกไปแล้วหรือรอบถูกยกเลิก ยกเลิกการจองไม่ได้")
	default:
		internal(w, err)
	}
}
