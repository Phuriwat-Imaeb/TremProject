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
	admin := func(f http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole(f, "admin")) }

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("GET /api/me", login(h.Me))
	mux.HandleFunc("GET /api/species", h.ListSpecies)
	mux.HandleFunc("GET /api/areas", h.ListAreas)

	mux.HandleFunc("GET /api/articles", maybe(h.ListArticles))
	mux.HandleFunc("GET /api/articles/{id}", maybe(h.GetArticle))
	mux.HandleFunc("GET /api/admin/articles", admin(h.AdminListArticles))
	mux.HandleFunc("POST /api/admin/articles", admin(h.CreateArticle))
	mux.HandleFunc("GET /api/admin/articles/{id}", admin(h.AdminGetArticle))
	mux.HandleFunc("PUT /api/admin/articles/{id}", admin(h.UpdateArticle))
	mux.HandleFunc("DELETE /api/admin/articles/{id}", admin(h.DeleteArticle))
	return mux
}
