package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"jongkookhub/auth"
	"jongkookhub/handler"
	"jongkookhub/mw"
)

// routes รวมทุกเส้นทางไว้ที่เดียว แยกจาก main เพื่อให้ main_test.go ยิงคำขอผ่าน router จริงได้
// origins คือ ALLOWED_ORIGINS ของ CORS
func routes(h *handler.Handler, tickets *auth.Issuer, origins []string) *gin.Engine {
	login := mw.RequireLogin(tickets)
	maybe := mw.OptionalLogin(tickets)

	// gin.New() ได้ router เปล่า ๆ เลือก middleware เอง (gin.Default() จะแถม Logger ของ Gin มาด้วย)
	r := gin.New()
	r.HandleMethodNotAllowed = true // path ถูกแต่ method ผิด ตอบ 405 แทน 404
	// ทุกคำขอผ่านด่านเหล่านี้ตามลำดับ: จด log → กัน panic (ตอบ 500 แทนเซิร์ฟเวอร์ล่ม) → CORS
	r.Use(mw.Logging(), gin.Recovery(), mw.CORS(origins))

	api := r.Group("/api")
	api.POST("/auth/register", h.Register)
	api.POST("/auth/login", h.Login)
	api.GET("/me", login, h.Me)
	api.PUT("/me/password", login, h.ChangePassword)
	api.GET("/me/bookings", login, h.MyBookings)
	api.GET("/routes", h.ListRoutes)
	api.GET("/trips", h.ListTrips)
	api.GET("/trips/:id", h.GetTrip)
	api.GET("/trips/:id/seats", h.TripSeats)
	api.GET("/trips/:id/live", h.TripLive) // WebSocket
	api.POST("/bookings", login, h.CreateBooking)
	api.GET("/bookings/:id", login, h.GetBooking)
	api.POST("/bookings/:id/cancel", login, h.CancelBooking)

	api.GET("/articles", maybe, h.ListArticles)
	api.GET("/articles/:id", maybe, h.GetArticle)

	// group: ทุกเส้นทางใต้ /api/staff ต้องผ่าน login + บทบาท staff หรือ admin ก่อน ไม่ต้องเขียนซ้ำทีละบรรทัด
	staff := api.Group("/staff", login, mw.RequireRole("staff", "admin"))
	staff.GET("/stats", h.StaffStats)
	staff.GET("/trips", h.StaffListTrips)
	staff.POST("/trips", h.CreateTrip)
	staff.PUT("/trips/:id", h.UpdateTrip)
	staff.POST("/trips/:id/cancel", h.CancelTrip)
	staff.GET("/trips/:id/passengers", h.TripPassengers)
	staff.GET("/vehicles", h.StaffListVehicles)

	// /api/admin เฉพาะ admin
	admin := api.Group("/admin", login, mw.RequireRole("admin"))
	admin.GET("/articles", h.AdminListArticles)
	admin.POST("/articles", h.CreateArticle)
	admin.GET("/articles/:id", h.AdminGetArticle)
	admin.PUT("/articles/:id", h.UpdateArticle)
	admin.DELETE("/articles/:id", h.DeleteArticle)

	admin.GET("/members", h.AdminListMembers)
	admin.PUT("/members/:id/role", h.SetMemberRole)

	admin.POST("/routes", h.CreateRoute)
	admin.PUT("/routes/:id", h.UpdateRoute)
	admin.DELETE("/routes/:id", h.DeleteRoute)
	admin.POST("/vehicles", h.CreateVehicle)
	admin.PUT("/vehicles/:id", h.UpdateVehicle)
	admin.DELETE("/vehicles/:id", h.DeleteVehicle)

	// path ที่ไม่มี หรือ method ผิด ก็ตอบ error หน้าตาเดียวกับที่อื่น
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "ไม่พบหน้านี้"}})
	})
	r.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": gin.H{"code": "METHOD_NOT_ALLOWED", "message": "ไม่รองรับ method นี้"}})
	})
	return r
}
