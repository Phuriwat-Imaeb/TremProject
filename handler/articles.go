package handler

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"jongkookhub/mw"
	"jongkookhub/store"
)

// แม่แบบ CRUD: ทำตารางใหม่ให้คัดลอกไฟล์นี้กับ store/articles.go แล้วเปลี่ยนชื่อ/ฟิลด์
//   หน้าบ้าน  GET  /api/articles, /api/articles/{id}        ใครก็อ่านได้ เห็นแค่ที่เผยแพร่แล้ว
//   หลังบ้าน  GET/POST /api/admin/articles, GET/PUT/DELETE /api/admin/articles/{id}  เฉพาะ admin

// cleanArticle ตัดช่องว่างแล้วตรวจของที่ส่งมา ผ่านคืน "" ไม่ผ่านคืนข้อความบอกผู้ใช้
func cleanArticle(in *store.ArticleInput) string {
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	if in.CoverURL != nil {
		if u := strings.TrimSpace(*in.CoverURL); u != "" {
			in.CoverURL = &u
		} else {
			in.CoverURL = nil // ส่งมาว่าง ๆ ถือว่าไม่มีรูป (เก็บเป็น NULL)
		}
	}
	switch {
	case in.Title == "" || utf8.RuneCountInString(in.Title) > 200:
		return "หัวข้อต้องยาว 1-200 ตัวอักษร"
	case in.Body == "":
		return "กรุณากรอกเนื้อหา"
	// รับแค่ http(s) กันคนใส่ javascript:... ไว้ใน <img src> ของหน้าเว็บ
	case in.CoverURL != nil && !strings.HasPrefix(*in.CoverURL, "https://") && !strings.HasPrefix(*in.CoverURL, "http://"):
		return "ลิงก์รูปปกต้องขึ้นต้นด้วย http:// หรือ https://"
	}
	return ""
}

// hidePhone คนที่ยังไม่ login ไม่เห็นเบอร์โทรคนเขียน (ตามสัญญา Person)
func hidePhone(c *gin.Context, a *store.Article) {
	if mw.WhoFrom(c).ID == 0 {
		a.Author.Phone = nil
	}
}

// ListArticles  GET /api/articles?q=&page=  เฉพาะที่เผยแพร่แล้ว ใหม่สุดก่อน หน้าละ 10
func (h *Handler) ListArticles(c *gin.Context) {
	h.listArticles(c, false)
}

// GetArticle  GET /api/articles/{id}  ฉบับร่างตอบ 404 เหมือนไม่มี
func (h *Handler) GetArticle(c *gin.Context) {
	h.getArticle(c, false)
}

// AdminListArticles  GET /api/admin/articles?q=&page=  รวมฉบับร่าง
func (h *Handler) AdminListArticles(c *gin.Context) {
	h.listArticles(c, true)
}

func (h *Handler) listArticles(c *gin.Context, drafts bool) {
	q, page, ok := readPaging(c)
	if !ok {
		return
	}
	items, total, err := h.Store.ListArticles(c.Request.Context(),
		store.ArticleFilter{Drafts: drafts, Q: q, Page: page, PageSize: pageSize})
	if err != nil {
		internal(c, err)
		return
	}
	for i := range items {
		hidePhone(c, &items[i])
	}
	writePage(c, items, page, total)
}

// AdminGetArticle  GET /api/admin/articles/{id}  อ่านฉบับร่างได้ ใช้เปิดหน้าแก้ไข
func (h *Handler) AdminGetArticle(c *gin.Context) {
	h.getArticle(c, true)
}

func (h *Handler) getArticle(c *gin.Context, drafts bool) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	a, err := h.Store.ArticleByID(c.Request.Context(), id, drafts)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	hidePhone(c, &a)
	c.JSON(http.StatusOK, a)
}

// CreateArticle  POST /api/admin/articles  คนเขียนคือเจ้าของตั๋ว ไม่รับจาก body
func (h *Handler) CreateArticle(c *gin.Context) {
	var in store.ArticleInput
	if !readJSON(c, &in) {
		return
	}
	if msg := cleanArticle(&in); msg != "" {
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", msg)
		return
	}
	a, err := h.Store.CreateArticle(c.Request.Context(), mw.WhoFrom(c).ID, in)
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusCreated, a)
}

// UpdateArticle  PUT /api/admin/articles/{id}  แก้ทั้งเรื่อง ฟิลด์ที่ไม่ส่งมาจะกลายเป็นค่าว่าง
func (h *Handler) UpdateArticle(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	var in store.ArticleInput
	if !readJSON(c, &in) {
		return
	}
	if msg := cleanArticle(&in); msg != "" {
		writeError(c, http.StatusBadRequest, "MISSING_FIELD", msg)
		return
	}
	a, err := h.Store.UpdateArticle(c.Request.Context(), id, in)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.JSON(http.StatusOK, a)
}

// DeleteArticle  DELETE /api/admin/articles/{id}  สำเร็จตอบ 204 ไม่มี body
func (h *Handler) DeleteArticle(c *gin.Context) {
	id, ok := pathID(c, "id")
	if !ok {
		writeError(c, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	err := h.Store.DeleteArticle(c.Request.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(c, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
