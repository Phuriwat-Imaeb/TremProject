package store

import "context"

// Species ชนิดสัตว์ หน้าตาตรงกับ schema Species ใน openapi.yaml
type Species struct {
	ID     int16  `json:"id"`
	NameTh string `json:"nameTh"`
	NameEn string `json:"nameEn"`
}

// Area พื้นที่ หน้าตาตรงกับ schema Area ใน openapi.yaml
type Area struct {
	ID   int16  `json:"id"`
	Name string `json:"name"`
}

func (s *Store) ListSpecies(ctx context.Context) ([]Species, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id, name_th, name_en FROM species ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Species{} // เริ่มจาก slice ว่าง ไม่ใช่ nil เพื่อให้ JSON ออกมาเป็น [] ไม่ใช่ null
	for rows.Next() {
		var sp Species
		if err := rows.Scan(&sp.ID, &sp.NameTh, &sp.NameEn); err != nil {
			return nil, err
		}
		out = append(out, sp)
	}
	return out, rows.Err()
}

func (s *Store) ListAreas(ctx context.Context) ([]Area, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id, name FROM areas ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Area{}
	for rows.Next() {
		var a Area
		if err := rows.Scan(&a.ID, &a.Name); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
