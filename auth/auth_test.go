package auth

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secret = []byte("test-secret-ที่ยาวพอสำหรับการทดสอบเท่านั้น-1234")

func sign(t *testing.T, method jwt.SigningMethod, key any, claims jwt.MapClaims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(method, claims).SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestPassword(t *testing.T) {
	a, _ := HashPassword("password123")
	b, _ := HashPassword("password123")
	if a == b {
		t.Error("hash รหัสเดิมสองครั้งต้องไม่ซ้ำกัน (salt)")
	}
	if !CheckPassword(a, "password123") {
		t.Error("รหัสถูก ต้องผ่าน")
	}
	if CheckPassword(a, "password124") {
		t.Error("รหัสผิด ต้องไม่ผ่าน")
	}
}

// hash ใน db/seed.sql ต้องเป็นของ password123 จริง ไม่งั้นบัญชีทดสอบจะ login ไม่ได้
func TestSeedHash(t *testing.T) {
	const seed = "$2a$10$SK7KSurRB3YrHp/YIt2FXuVVHDoItGyu8UluBihYefjKjU19M7K7a"
	if !CheckPassword(seed, "password123") {
		t.Error("hash ใน seed.sql ไม่ตรงกับ password123")
	}
}

func TestGenuineTicket(t *testing.T) {
	iss := &Issuer{Secret: secret, TTL: time.Hour}
	token, err := iss.Issue(3, "member")
	if err != nil {
		t.Fatal(err)
	}
	id, role, err := iss.Parse(token)
	if err != nil || id != 3 || role != "member" {
		t.Fatalf("ตั๋วจริงต้องผ่าน ได้ id=%d role=%q err=%v", id, role, err)
	}
}

// ตั๋วปลอมทุกแบบต้องโดนปฏิเสธ
func TestForgedTickets(t *testing.T) {
	iss := &Issuer{Secret: secret, TTL: time.Hour}
	genuine, _ := iss.Issue(1, "member")
	now := time.Now()
	good := jwt.MapClaims{"sub": "1", "role": "admin", "exp": now.Add(time.Hour).Unix()}

	// แก้ role ในตั๋วจริงจาก member เป็น admin แต่ใช้ลายเซ็นเดิม
	p := strings.Split(genuine, ".")
	body, _ := base64.RawURLEncoding.DecodeString(p[1])
	body = []byte(strings.Replace(string(body), "member", "admin", 1))
	edited := p[0] + "." + base64.RawURLEncoding.EncodeToString(body) + "." + p[2]

	cases := []struct {
		name  string
		token string
	}{
		{"แก้ role แล้วใช้ลายเซ็นเดิม", edited},
		{"เซ็นด้วยกุญแจอื่น", sign(t, jwt.SigningMethodHS256, []byte("กุญแจของแฮกเกอร์-ที่ยาวพอ-1234567890"), good)},
		{"alg none ไม่มีลายเซ็น", sign(t, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, good)},
		{"อัลกอริทึมอื่น HS512", sign(t, jwt.SigningMethodHS512, secret, good)},
		{"หมดอายุแล้ว", sign(t, jwt.SigningMethodHS256, secret, jwt.MapClaims{"sub": "1", "role": "admin", "exp": now.Add(-time.Minute).Unix()})},
		{"ไม่มีวันหมดอายุ", sign(t, jwt.SigningMethodHS256, secret, jwt.MapClaims{"sub": "1", "role": "admin"})},
		{"sub ไม่ใช่ตัวเลข", sign(t, jwt.SigningMethodHS256, secret, jwt.MapClaims{"sub": "abc", "role": "admin", "exp": now.Add(time.Hour).Unix()})},
		{"ไม่ใช่ตั๋วเลย", "hello"},
	}
	for _, c := range cases {
		if _, _, err := iss.Parse(c.token); err == nil {
			t.Errorf("%s: ต้องโดนปฏิเสธ แต่ผ่าน", c.name)
		}
	}
}
