package handler

import "net/http"

// ListSpecies  GET /api/species
func (h *Handler) ListSpecies(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListSpecies(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ListAreas  GET /api/areas
func (h *Handler) ListAreas(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListAreas(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}
