package handler

import (
	"errors"
	"net/http"
	"slices"

	"jongkookhub/mw"
	"jongkookhub/store"
)

// บทบาทที่ตั้งได้ ต้องตรงกับ CHECK ของตาราง members ใน schema.sql
var roles = []string{"member", "staff", "admin"}

// AdminListMembers  GET /api/admin/members  สมาชิกทั้งหมด เรียงตาม id
func (h *Handler) AdminListMembers(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListMembers(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type roleReq struct {
	Role string `json:"role"`
}

// SetMemberRole  PUT /api/admin/members/{id}/role
// บทบาทอยู่ในตั๋ว สมาชิกต้อง login ใหม่ถึงจะได้สิทธิ์ใหม่ (ตั๋วเดิมใช้ต่อได้จนหมดอายุ 1 ชั่วโมง)
func (h *Handler) SetMemberRole(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	var req roleReq
	if !readJSON(w, r, &req) {
		return
	}
	if !slices.Contains(roles, req.Role) {
		writeError(w, http.StatusBadRequest, "BAD_STATUS", "บทบาทต้องเป็น member, staff หรือ admin")
		return
	}
	// กันแอดมินลดสิทธิ์ตัวเองจนระบบไม่เหลือแอดมิน
	if id == mw.WhoFrom(r.Context()).ID {
		writeError(w, http.StatusConflict, "CANNOT_CHANGE_SELF", "เปลี่ยนบทบาทของตัวเองไม่ได้")
		return
	}
	m, err := h.Store.SetMemberRole(r.Context(), id, req.Role)
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
