package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"petfinder/handler"
	"petfinder/mw"
	"petfinder/store"
)

func main() {
	// เปิดฐานข้อมูล อ่านที่อยู่จากตัวแปรระบบ ไม่เขียนรหัสผ่านไว้ในโค้ด
	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("ต่อฐานข้อมูลไม่ติด ", err)
	}

	h := &handler.Handler{Store: &store.Store{Pool: pool}}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/species", h.ListSpecies)
	mux.HandleFunc("GET /api/areas", h.ListAreas)

	log.Println("PetFinder API รออยู่ที่ :8080")
	log.Fatal(http.ListenAndServe(":8080", mw.Logging(mux)))
}
