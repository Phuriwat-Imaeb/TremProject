package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims คือสิ่งที่เขียนไว้บนตั๋ว: เป็นใคร (sub) บทบาทอะไร (role) หมดอายุเมื่อไหร่ (exp)
// ใครก็ถอดอ่านได้ (เป็นแค่ base64) แต่แก้ไม่ได้ เพราะลายเซ็นจะไม่ตรง
type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// Issuer คือเครื่องออกตั๋วและตรวจตั๋ว ถือกุญแจลับ (Secret) ไว้เซ็น
type Issuer struct {
	Secret []byte
	TTL    time.Duration
}

// Issue ออกตั๋วใหม่ให้สมาชิก อายุ TTL นับจากตอนนี้
func (i *Issuer) Issue(memberID int64, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(memberID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(i.TTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.Secret)
}

// Parse ตรวจตั๋ว ผ่านแล้วคืน id กับบทบาทของเจ้าของตั๋ว
func (i *Issuer) Parse(tokenString string) (int64, string, error) {
	var c Claims
	_, err := jwt.ParseWithClaims(tokenString, &c,
		func(t *jwt.Token) (any, error) { return i.Secret, nil },
		jwt.WithValidMethods([]string{"HS256"}), // กันตั๋วปลอมที่ตั้ง alg เป็น none หรือแบบอื่น
		jwt.WithExpirationRequired(),            // ตั๋วที่ไม่มีวันหมดอายุ ไม่รับ
	)
	if err != nil {
		return 0, "", err
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return 0, "", errors.New("bad subject")
	}
	return id, c.Role, nil
}
