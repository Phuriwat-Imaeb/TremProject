package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// Person คนเขียน/คนโพสต์แบบย่อ หน้าตาตรงกับ schema Person ใน openapi.yaml
type Person struct {
	ID          int64   `json:"id"`
	DisplayName string  `json:"displayName"`
	Phone       *string `json:"phone"` // handler ลบทิ้งเป็น null ถ้าคนดูยังไม่ได้ login
}

// Article บทความ หน้าตาตรงกับ schema Article ใน openapi.yaml
type Article struct {
	ID        int64     `json:"id"`
	Author    Person    `json:"author"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CoverURL  *string   `json:"coverUrl"`
	Published bool      `json:"published"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ArticleInput ของที่ admin ส่งมาตอนสร้าง/แก้ (ArticleInput ใน openapi.yaml) handler ตรวจความถูกต้องมาแล้ว
type ArticleInput struct {
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	CoverURL  *string `json:"coverUrl"`
	Published bool    `json:"published"`
}

// ทุก query ของบทความดึงคอลัมน์ชุดเดียวกัน พร้อมชื่อคนเขียนจาก members
const articleCols = `a.id, m.id, m.display_name, m.phone,
	a.title, a.body, a.cover_url, a.published, a.created_at, a.updated_at`

const articleFrom = ` FROM articles a JOIN members m ON m.id = a.author_id`

func scanArticle(row pgx.Row) (Article, error) {
	var a Article
	err := row.Scan(&a.ID, &a.Author.ID, &a.Author.DisplayName, &a.Author.Phone,
		&a.Title, &a.Body, &a.CoverURL, &a.Published, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Article{}, ErrNotFound
	}
	return a, err
}

// ArticleFilter ตัวกรองหน้ารายการ handler ตรวจค่ามาแล้ว (Page เริ่มที่ 1)
type ArticleFilter struct {
	Drafts   bool   // false = หน้าบ้าน เห็นแค่ที่เผยแพร่แล้ว
	Q        string // ค้นในหัวข้อหรือเนื้อหา ว่าง = ไม่กรอง
	Page     int
	PageSize int
}

// likePattern ครอบคำค้นเป็น %คำ% ให้ ILIKE หาแบบ "มีคำนี้อยู่ตรงไหนก็ได้"
// ต้อง escape % _ \ ก่อน ไม่งั้นคนพิมพ์ "%" จะได้ทุกแถว
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func likePattern(q string) string {
	return "%" + likeEscaper.Replace(q) + "%"
}

// ListArticles บทความใหม่สุดก่อน ทีละหน้า คืนรายการของหน้านั้น + จำนวนทั้งหมดที่ตรงตัวกรอง (ไว้คำนวณจำนวนหน้า)
func (s *Store) ListArticles(ctx context.Context, f ArticleFilter) ([]Article, int, error) {
	// $1 = เห็นฉบับร่างไหม, $2 = คำค้น ('' = ไม่กรอง) ใช้เงื่อนไขชุดเดียวกันทั้งนับและดึง
	const where = ` WHERE (a.published OR $1)
		AND ($2 = '' OR a.title ILIKE $3 OR a.body ILIKE $3)`
	args := []any{f.Drafts, f.Q, likePattern(f.Q)}

	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*)`+articleFrom+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.Pool.Query(ctx,
		`SELECT `+articleCols+articleFrom+where+`
		  ORDER BY a.created_at DESC, a.id DESC
		  LIMIT $4 OFFSET $5`, append(args, f.PageSize, (f.Page-1)*f.PageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []Article{}
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, a)
	}
	return out, total, rows.Err()
}

// ArticleByID หาบทความหนึ่งเรื่อง drafts = false แล้วเจอฉบับร่าง ถือว่าไม่เจอ (ErrNotFound)
func (s *Store) ArticleByID(ctx context.Context, id int64, drafts bool) (Article, error) {
	return scanArticle(s.Pool.QueryRow(ctx,
		`SELECT `+articleCols+articleFrom+` WHERE a.id = $1 AND (a.published OR $2)`, id, drafts))
}

// CreateArticle สร้างบทความใหม่ คนเขียนคือเจ้าของตั๋ว แล้วอ่านกลับมาทั้งเรื่องพร้อมชื่อคนเขียน
func (s *Store) CreateArticle(ctx context.Context, authorID int64, in ArticleInput) (Article, error) {
	var id int64
	err := s.Pool.QueryRow(ctx,
		`INSERT INTO articles (author_id, title, body, cover_url, published)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`, authorID, in.Title, in.Body, in.CoverURL, in.Published).Scan(&id)
	if err != nil {
		return Article{}, err
	}
	return s.ArticleByID(ctx, id, true)
}

// UpdateArticle แก้ทั้งเรื่อง (PUT) และตั้ง updated_at ใหม่ ไม่มี id นี้ → ErrNotFound
func (s *Store) UpdateArticle(ctx context.Context, id int64, in ArticleInput) (Article, error) {
	tag, err := s.Pool.Exec(ctx,
		`UPDATE articles
		    SET title = $2, body = $3, cover_url = $4, published = $5, updated_at = now()
		  WHERE id = $1`, id, in.Title, in.Body, in.CoverURL, in.Published)
	if err != nil {
		return Article{}, err
	}
	if tag.RowsAffected() == 0 {
		return Article{}, ErrNotFound
	}
	return s.ArticleByID(ctx, id, true)
}

// DeleteArticle ลบบทความ ไม่มี id นี้ → ErrNotFound
func (s *Store) DeleteArticle(ctx context.Context, id int64) error {
	tag, err := s.Pool.Exec(ctx, `DELETE FROM articles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
