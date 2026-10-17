package handler

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"petfinder/mw"
	"petfinder/store"
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
func hidePhone(r *http.Request, a *store.Article) {
	if mw.WhoFrom(r.Context()).ID == 0 {
		a.Author.Phone = nil
	}
}

// ListArticles  GET /api/articles?q=&page=  เฉพาะที่เผยแพร่แล้ว ใหม่สุดก่อน หน้าละ 10
func (h *Handler) ListArticles(w http.ResponseWriter, r *http.Request) {
	h.listArticles(w, r, false)
}

// GetArticle  GET /api/articles/{id}  ฉบับร่างตอบ 404 เหมือนไม่มี
func (h *Handler) GetArticle(w http.ResponseWriter, r *http.Request) {
	h.getArticle(w, r, false)
}

// AdminListArticles  GET /api/admin/articles?q=&page=  รวมฉบับร่าง
func (h *Handler) AdminListArticles(w http.ResponseWriter, r *http.Request) {
	h.listArticles(w, r, true)
}

func (h *Handler) listArticles(w http.ResponseWriter, r *http.Request, drafts bool) {
	q, page, ok := readPaging(w, r)
	if !ok {
		return
	}
	items, total, err := h.Store.ListArticles(r.Context(),
		store.ArticleFilter{Drafts: drafts, Q: q, Page: page, PageSize: pageSize})
	if err != nil {
		internal(w, err)
		return
	}
	for i := range items {
		hidePhone(r, &items[i])
	}
	writePage(w, items, page, total)
}

// AdminGetArticle  GET /api/admin/articles/{id}  อ่านฉบับร่างได้ ใช้เปิดหน้าแก้ไข
func (h *Handler) AdminGetArticle(w http.ResponseWriter, r *http.Request) {
	h.getArticle(w, r, true)
}

func (h *Handler) getArticle(w http.ResponseWriter, r *http.Request, drafts bool) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	a, err := h.Store.ArticleByID(r.Context(), id, drafts)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	hidePhone(r, &a)
	writeJSON(w, http.StatusOK, a)
}

// CreateArticle  POST /api/admin/articles  คนเขียนคือเจ้าของตั๋ว ไม่รับจาก body
func (h *Handler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	var in store.ArticleInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := cleanArticle(&in); msg != "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", msg)
		return
	}
	a, err := h.Store.CreateArticle(r.Context(), mw.WhoFrom(r.Context()).ID, in)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

// UpdateArticle  PUT /api/admin/articles/{id}  แก้ทั้งเรื่อง ฟิลด์ที่ไม่ส่งมาจะกลายเป็นค่าว่าง
func (h *Handler) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	var in store.ArticleInput
	if !readJSON(w, r, &in) {
		return
	}
	if msg := cleanArticle(&in); msg != "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", msg)
		return
	}
	a, err := h.Store.UpdateArticle(r.Context(), id, in)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// DeleteArticle  DELETE /api/admin/articles/{id}  สำเร็จตอบ 204 ไม่มี body
func (h *Handler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขต้องเป็นตัวเลข")
		return
	}
	err := h.Store.DeleteArticle(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "ไม่พบรายการนี้")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
