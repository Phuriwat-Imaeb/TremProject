package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"petfinder/auth"
	"petfinder/handler"
	"petfinder/mw"
	"petfinder/store"
)

func main() {
	// กุญแจเซ็นตั๋ว ต้องยาวพอให้เดาไม่ได้ และห้ามเขียนไว้ในโค้ด
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal(`JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร ลองสั่ง: openssl rand -hex 32 > .jwt_secret && export JWT_SECRET=$(cat .jwt_secret)`)
	}

	// เปิดฐานข้อมูล อ่านที่อยู่จากตัวแปรระบบ ไม่เขียนรหัสผ่านไว้ในโค้ด
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal(`ยังไม่ได้ตั้ง DATABASE_URL ลองสั่ง: export DATABASE_URL="postgres://postgres:secret@127.0.0.1:5432/petfinder"`)
	}
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("ต่อฐานข้อมูลไม่ติด ", err)
	}

	tickets := &auth.Issuer{Secret: []byte(secret), TTL: time.Hour}
	h := &handler.Handler{Store: &store.Store{Pool: pool}, Tickets: tickets}
	login := func(f http.HandlerFunc) http.HandlerFunc { return mw.RequireLogin(tickets, f) }

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("GET /api/me", login(h.Me))
	mux.HandleFunc("GET /api/species", h.ListSpecies)
	mux.HandleFunc("GET /api/areas", h.ListAreas)

	// หน้าเว็บ React จาก origin ไหนเรียก API ได้ คั่นด้วยจุลภาค เช่น http://localhost:3000
	origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")

	// Render กำหนด port ให้ผ่าน PORT ถ้าไม่มี (เครื่องตัวเอง) ใช้ 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("PetFinder API รออยู่ที่ :"+port, "origin ที่อนุญาต:", origins)
	log.Fatal(http.ListenAndServe(":"+port, mw.Logging(mw.CORS(origins, mux))))
}
