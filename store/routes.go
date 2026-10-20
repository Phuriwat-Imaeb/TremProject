package store

import "context"

// Route เส้นทางรถ หน้าตาตรงกับ schema Route ใน openapi.yaml
type Route struct {
	ID          int16  `json:"id"`
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	DurationMin int16  `json:"durationMin"`
}

func (s *Store) ListRoutes(ctx context.Context) ([]Route, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id, origin, destination, duration_min FROM routes ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Route{} // เริ่มจาก slice ว่าง ไม่ใช่ nil เพื่อให้ JSON ออกมาเป็น [] ไม่ใช่ null
	for rows.Next() {
		var rt Route
		if err := rows.Scan(&rt.ID, &rt.Origin, &rt.Destination, &rt.DurationMin); err != nil {
			return nil, err
		}
		out = append(out, rt)
	}
	return out, rows.Err()
}
