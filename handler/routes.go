package handler

import "net/http"

// ListRoutes  GET /api/routes  เส้นทางทั้งหมด ไว้ให้หน้าเว็บทำตัวเลือก ต้นทาง → ปลายทาง
func (h *Handler) ListRoutes(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListRoutes(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}
