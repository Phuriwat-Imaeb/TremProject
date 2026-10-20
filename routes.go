package main

import (
	"net/http"

	"petfinder/auth"
	"petfinder/handler"
	"petfinder/mw"
)

// routes รวมทุกเส้นทางไว้ที่เดียว แยกจาก main เพื่อให้ main_test.go ยิงคำขอผ่าน mux จริงได้
func routes(h *handler.Handler, tickets *auth.Issuer) *http.ServeMux {
	login := func(f http.HandlerFunc) http.HandlerFunc { return mw.RequireLogin(tickets, f) }
	maybe := func(f http.HandlerFunc) http.HandlerFunc { return mw.OptionalLogin(tickets, f) }
	staff := func(f http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole(f, "staff", "admin")) }
	admin := func(f http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole(f, "admin")) }

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("GET /api/me", login(h.Me))
	mux.HandleFunc("GET /api/me/bookings", login(h.MyBookings))
	mux.HandleFunc("GET /api/routes", h.ListRoutes)
	mux.HandleFunc("GET /api/trips", h.ListTrips)
	mux.HandleFunc("GET /api/trips/{id}", h.GetTrip)
	mux.HandleFunc("GET /api/trips/{id}/seats", h.TripSeats)
	mux.HandleFunc("POST /api/bookings", login(h.CreateBooking))
	mux.HandleFunc("GET /api/bookings/{id}", login(h.GetBooking))
	mux.HandleFunc("POST /api/bookings/{id}/cancel", login(h.CancelBooking))

	mux.HandleFunc("GET /api/articles", maybe(h.ListArticles))
	mux.HandleFunc("GET /api/articles/{id}", maybe(h.GetArticle))
	mux.HandleFunc("GET /api/admin/articles", admin(h.AdminListArticles))
	mux.HandleFunc("POST /api/admin/articles", admin(h.CreateArticle))
	mux.HandleFunc("GET /api/admin/articles/{id}", admin(h.AdminGetArticle))
	mux.HandleFunc("PUT /api/admin/articles/{id}", admin(h.UpdateArticle))
	mux.HandleFunc("DELETE /api/admin/articles/{id}", admin(h.DeleteArticle))

	mux.HandleFunc("GET /api/staff/trips", staff(h.StaffListTrips))
	mux.HandleFunc("POST /api/staff/trips", staff(h.CreateTrip))
	mux.HandleFunc("PUT /api/staff/trips/{id}", staff(h.UpdateTrip))
	mux.HandleFunc("POST /api/staff/trips/{id}/cancel", staff(h.CancelTrip))
	mux.HandleFunc("GET /api/staff/trips/{id}/passengers", staff(h.TripPassengers))
	mux.HandleFunc("GET /api/staff/vehicles", staff(h.StaffListVehicles))

	mux.HandleFunc("GET /api/admin/members", admin(h.AdminListMembers))
	mux.HandleFunc("PUT /api/admin/members/{id}/role", admin(h.SetMemberRole))

	mux.HandleFunc("POST /api/admin/routes", admin(h.CreateRoute))
	mux.HandleFunc("PUT /api/admin/routes/{id}", admin(h.UpdateRoute))
	mux.HandleFunc("DELETE /api/admin/routes/{id}", admin(h.DeleteRoute))
	mux.HandleFunc("POST /api/admin/vehicles", admin(h.CreateVehicle))
	mux.HandleFunc("PUT /api/admin/vehicles/{id}", admin(h.UpdateVehicle))
	mux.HandleFunc("DELETE /api/admin/vehicles/{id}", admin(h.DeleteVehicle))
	return mux
}
