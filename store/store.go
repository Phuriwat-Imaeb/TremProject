package store

import (
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound คือโน้ตมาตรฐานของห้องเก็บของ เวลาหาของไม่เจอ
// handler จะเอาไปแปลเป็น 404 เอง ห้องนี้ไม่รู้จัก HTTP
var ErrNotFound = errors.New("not found")

// Store ถือ pool การเชื่อมต่อฐานข้อมูล ทุก method ของห้องนี้ใช้ร่วมกัน
type Store struct {
	Pool *pgxpool.Pool
}
