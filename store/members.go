package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrEmailTaken อีเมลนี้มีบัญชีแล้ว handler แปลเป็น 409
var ErrEmailTaken = errors.New("email taken")

// Member สมาชิก หน้าตาตรงกับ schema Member ใน openapi.yaml
type Member struct {
	ID           int64   `json:"id"`
	Email        string  `json:"email"`
	DisplayName  string  `json:"displayName"`
	Phone        *string `json:"phone"` // pointer เพราะเป็น NULL ได้ → JSON ออกมาเป็น null
	Role         string  `json:"role"`
	PasswordHash string  `json:"-"` // "-" = ห้ามออกไปใน JSON เด็ดขาด
}

// CreateMember สร้างบัญชีใหม่ role ได้ค่าเริ่มต้น 'member' จากฐานข้อมูลเสมอ
func (s *Store) CreateMember(ctx context.Context, email, hash, name string, phone *string) (Member, error) {
	m := Member{Email: email, DisplayName: name, Phone: phone}
	err := s.Pool.QueryRow(ctx,
		`INSERT INTO members (email, password_hash, display_name, phone)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, role`, email, hash, name, phone).Scan(&m.ID, &m.Role)
	// 23505 = ชน unique index members_email_lower_uq (อีเมลซ้ำ ไม่สนตัวพิมพ์เล็กใหญ่)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return Member{}, ErrEmailTaken
	}
	return m, err
}

// MemberByEmail หาสมาชิกจากอีเมล (ส่งอีเมลตัวเล็กมาเสมอ) คืน hash มาด้วยเพื่อตรวจรหัสตอน login
func (s *Store) MemberByEmail(ctx context.Context, email string) (Member, error) {
	var m Member
	err := s.Pool.QueryRow(ctx,
		`SELECT id, email, display_name, phone, role, password_hash
		   FROM members WHERE lower(email) = $1`, email).
		Scan(&m.ID, &m.Email, &m.DisplayName, &m.Phone, &m.Role, &m.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound
	}
	return m, err
}

// MemberByID หาสมาชิกจาก id ในตั๋ว ไม่ดึง hash เพราะไม่ต้องใช้
func (s *Store) MemberByID(ctx context.Context, id int64) (Member, error) {
	var m Member
	err := s.Pool.QueryRow(ctx,
		`SELECT id, email, display_name, phone, role FROM members WHERE id = $1`, id).
		Scan(&m.ID, &m.Email, &m.DisplayName, &m.Phone, &m.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound
	}
	return m, err
}

// ListMembers สมาชิกทั้งหมด เรียงตาม id (หน้าหลังบ้าน) ไม่ดึง hash
func (s *Store) ListMembers(ctx context.Context) ([]Member, error) {
	rows, err := s.Pool.Query(ctx,
		`SELECT id, email, display_name, phone, role FROM members ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Member{}
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.Email, &m.DisplayName, &m.Phone, &m.Role); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// SetMemberRole เปลี่ยนบทบาท แล้วคืนข้อมูลหลังเปลี่ยน ไม่มี id นี้ → ErrNotFound
// (บทบาทที่ไม่อยู่ในรายการ handler กันไว้แล้ว และ CHECK ของตารางก็กันอีกชั้น)
func (s *Store) SetMemberRole(ctx context.Context, id int64, role string) (Member, error) {
	var m Member
	err := s.Pool.QueryRow(ctx,
		`UPDATE members SET role = $2 WHERE id = $1
		 RETURNING id, email, display_name, phone, role`, id, role).
		Scan(&m.ID, &m.Email, &m.DisplayName, &m.Phone, &m.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound
	}
	return m, err
}
