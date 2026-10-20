package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ListRoutes  GET /api/routes  เส้นทางทั้งหมด ไว้ให้หน้าเว็บทำตัวเลือก ต้นทาง → ปลายทาง
func (h *Handler) ListRoutes(c *gin.Context) {
	items, err := h.Store.ListRoutes(c.Request.Context())
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, map[string]any{"items": items})
}
