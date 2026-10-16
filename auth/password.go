package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword แปลงรหัสผ่านเป็น bcrypt hash ไว้เก็บลงฐานข้อมูล (เก็บรหัสจริงไม่ได้เด็ดขาด)
// hash รหัสเดิมสองครั้งได้ผลไม่ซ้ำกัน เพราะ bcrypt สุ่ม salt ใส่ให้ทุกครั้ง
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

// CheckPassword ตรวจว่ารหัสที่พิมพ์มาตรงกับ hash ที่เก็บไว้ไหม
func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// dummyHash ใช้ตอน login ด้วยอีเมลที่ไม่มีในระบบ
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("not-a-real-password"), bcrypt.DefaultCost)

// WasteTime เสียเวลาตรวจรหัสเท่ากับของจริง (~70ms) ทั้งที่ไม่มีบัญชีให้ตรวจ
// ถ้าไม่ทำ อีเมลที่ไม่มีจะตอบเร็วกว่ามาก (~1ms) คนนอกจับเวลาแล้วรู้ได้ว่าอีเมลไหนมีบัญชี
func WasteTime(plain string) {
	bcrypt.CompareHashAndPassword(dummyHash, []byte(plain))
}
