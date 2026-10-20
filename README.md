# TremProject

API หลังบ้าน (Go + PostgreSQL) และหน้าเว็บ React ([web/](web)) วิชา 520342 Server Side Web Programming
สัญญา API ทั้งหมดอยู่ใน [openapi.yaml](openapi.yaml)

## รันบนเครื่อง / Codespaces

```bash
# 1) เปิดฐานข้อมูล แล้วสร้างตาราง + ข้อมูลตัวอย่าง
docker compose up -d
export DATABASE_URL="postgres://postgres:secret@127.0.0.1:5432/petfinder"
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql

# 2) กุญแจเซ็นตั๋ว JWT (ทำครั้งเดียว ไฟล์นี้อยู่ใน .gitignore แล้ว)
openssl rand -hex 32 > .jwt_secret
export JWT_SECRET=$(cat .jwt_secret)

# 3) หน้าเว็บ React ที่อนุญาตให้เรียก API
export ALLOWED_ORIGINS=http://localhost:3000

go run .
```

หน้าเว็บ (อีกหน้าต่าง ต้องมี Node.js 18 ขึ้นไป):

```bash
cd web
npm install
npm start          # เปิด http://localhost:3000
```

ตอน `npm start` คำขอ `/api/*` จะถูกส่งต่อไปที่ Go ที่ `http://localhost:8080` ให้เอง ([web/src/setupProxy.js](web/src/setupProxy.js))
ถ้า Go รันอยู่ที่อื่นให้ตั้ง `API_PROXY_TARGET` ส่วนตอน deploy ให้ตั้ง `REACT_APP_API_URL` (ดู [web/.env.example](web/.env.example))

บัญชีทดสอบจาก `seed.sql` ใช้รหัสผ่าน `password123` ทุกบัญชี:
`admin@tremproject.test` (admin), `staff@tremproject.test` (staff),
`nida@example.com` และ `ton@example.com` (member)

## ตัวแปรระบบ

| ชื่อ | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ✔ | ที่อยู่ฐานข้อมูล PostgreSQL |
| `JWT_SECRET` | ✔ | กุญแจเซ็นตั๋ว ยาวอย่างน้อย 32 ตัวอักษร |
| `ALLOWED_ORIGINS` | | origin ของหน้าเว็บ คั่นด้วยจุลภาค เช่น `http://localhost:3000,https://xxx.vercel.app` |
| `PORT` | | port ที่เปิดรอ (ไม่ตั้ง = 8080, Render ตั้งให้เอง) |

## Deploy

ฐานข้อมูลบน [Neon](https://neon.tech), API บน [Render](https://render.com), หน้าเว็บบน [Vercel](https://vercel.com) ทั้งหมดใช้แบบฟรีได้

1. **Neon**: สร้าง project (region Singapore) แล้วคัดลอก connection string (ขึ้นต้น `postgresql://...` และมี `?sslmode=require`)
   เปิด SQL Editor วางเนื้อหา `db/schema.sql` กด Run แล้วทำแบบเดียวกันกับ `db/seed.sql`
2. **Render**: New → Blueprint → เลือก repo นี้ จะอ่าน [render.yaml](render.yaml) แล้วถามค่า
   - `DATABASE_URL` = connection string จาก Neon
   - `ALLOWED_ORIGINS` = ใส่อะไรก็ได้ไปก่อน (เช่น `http://localhost:3000`) ได้ URL ของ Vercel แล้วค่อยมาแก้
   - `JWT_SECRET` Render สุ่มให้เอง

   เสร็จแล้วเปิด `https://<ชื่อ>.onrender.com/api/routes` ต้องได้ JSON
3. **Vercel**: Add New → Project → เลือก repo นี้ ตั้ง Root Directory เป็น `web`
   และตั้ง Environment Variable `REACT_APP_API_URL` = URL ของ Render (ไม่ต้องมี `/` ท้าย)
   ([web/vercel.json](web/vercel.json) ทำให้รีเฟรชหน้า `/login`, `/me` แล้วไม่ 404)
4. กลับไปที่ Render แก้ `ALLOWED_ORIGINS` เป็น URL ของ Vercel เช่น `https://xxx.vercel.app` (Render จะ deploy ใหม่เอง)

หลังจากนี้ push ขึ้น `main` ทั้ง Render และ Vercel จะ deploy ใหม่ให้เอง
แบบฟรีของ Render จะหลับเมื่อไม่มีคนเรียก 15 นาที คำขอแรกหลังจากนั้นจะช้าราวครึ่งนาที

## เทสต์

```bash
go test ./...
cd web && npm test
```

เทสต์ของ Go ที่ยิงคำขอผ่านทุกชั้นจนถึงฐานข้อมูลจริง ([main_test.go](main_test.go)) จะรันเฉพาะตอนตั้ง `DATABASE_URL`
ไว้แล้วรัน `schema.sql` + `seed.sql` เรียบร้อย ไม่ตั้งก็ข้ามไปเฉย ๆ (เทสต์จะสร้างแล้วลบบทความของตัวเอง ไม่ทิ้งขยะไว้)

GitHub Actions รัน gofmt, go vet, build, schema/seed และเทสต์ของ Go กับเทสต์ + build ของหน้าเว็บ ให้ทุกครั้งที่ push ขึ้น `main`

## เส้นทางที่ทำแล้ว

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me`
- `GET /api/routes` เส้นทางรถทั้งหมด
- รอบรถ: `GET /api/trips?routeId=&date=YYYY-MM-DD` (เฉพาะรอบที่ยังจองได้ วันที่ตามเวลาไทย), `GET /api/trips/{id}`,
  `GET /api/trips/{id}/seats` ผังที่นั่ง `{ kind, seatCount, taken }`
- การจอง (ต้องเข้าสู่ระบบ): `POST /api/bookings` `{ tripId, seats }` ทำใน transaction ที่นั่งไม่ว่างตอบ 409 `SEAT_TAKEN`,
  `GET /api/bookings/{id}` (ของตัวเอง หรือ staff/admin ดูได้ทุกรายการ)
- บทความ: `GET /api/articles`, `GET /api/articles/{id}` (ใครก็อ่านได้ เห็นแค่ที่เผยแพร่แล้ว)
  และ `GET`/`POST /api/admin/articles`, `GET`/`PUT`/`DELETE /api/admin/articles/{id}` (เฉพาะ admin)
  หน้ารายการรับ `?q=คำค้น&page=เลขหน้า` หน้าละ 10 ตอบ `{ items, page, pageSize, total }`
- สมาชิก (เฉพาะ admin): `GET /api/admin/members`, `PUT /api/admin/members/{id}/role` (เปลี่ยนของตัวเองไม่ได้ ตอบ 409)

## หน้าเว็บที่ทำแล้ว

- `/login`, `/register` สมัครเสร็จจะเข้าสู่ระบบให้ทันที
- `/me` ข้อมูลบัญชี (ต้องเข้าสู่ระบบก่อน ไม่งั้นจะถูกพาไป `/login` แล้วกลับมาหน้าเดิมหลังเข้าสู่ระบบ)
- `/trips` ค้นหารอบรถตามเส้นทาง/วัน (ตัวกรองอยู่ใน URL), `/trips/:id` รายละเอียดรอบ + ผังที่นั่ง เลือกที่นั่งแล้วกดจองได้
- `/bookings/:id` หน้าตั๋วหลังจองสำเร็จ (ต้องเข้าสู่ระบบ)
- `/articles`, `/articles/:id` อ่านบทความ
- `/articles` ค้นหาและเลื่อนหน้าได้ คำค้นกับเลขหน้าอยู่ใน URL (`?q=&page=`) กด back ได้ แชร์ลิงก์ได้
- หลังบ้าน `/admin` (เฉพาะ admin) มีแท็บ: `/admin/articles` จัดการบทความ (ค้นหาได้ รวมฉบับร่าง),
  `/admin/articles/new` เขียนใหม่, `/admin/articles/:id/edit` แก้ไข, `/admin/members` เปลี่ยนบทบาทสมาชิก
- URL ที่ไม่มีอยู่ขึ้นหน้า 404
- ตั๋วหมดอายุระหว่างใช้งาน (ได้ 401) จะออกจากระบบให้ พาไป `/login` พร้อมบอกเหตุผล แล้วกลับหน้าเดิมหลังเข้าสู่ระบบใหม่

### ของที่ใช้ร่วมกันในหน้าเว็บ

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| [web/src/config.js](web/src/config.js) | ชื่อแอป `APP_NAME` เปลี่ยนหัวข้อแก้ที่นี่ (กับ `<title>` ใน `public/index.html` และ `public/manifest.json`) |
| [web/src/hooks/useApi.js](web/src/hooks/useApi.js) | โหลดข้อมูลแบบ 3 สถานะ `{ data, error, loading }` พร้อม `setData`, `reload` |
| [web/src/hooks/usePageTitle.js](web/src/hooks/usePageTitle.js) | ชื่อแท็บเบราว์เซอร์ของแต่ละหน้า |
| [web/src/hooks/useListQuery.js](web/src/hooks/useListQuery.js) | คำค้น + เลขหน้าจาก URL ของหน้ารายการ |
| [web/src/components/](web/src/components) | `Button`/`ButtonLink`, `Alert`, `Loading`, `EmptyState`, `PageHeader`, `ConfirmDialog`, `SearchBox`, `Pagination`, `Field`, `ProtectedRoute`, `Navbar` |
| [web/src/components/Toast.jsx](web/src/components/Toast.jsx) | ข้อความเด้งมุมจอ `useToast().success(...)` / `.error(...)` |
| [web/src/test-utils.jsx](web/src/test-utils.jsx) | ตัวช่วยเทสต์: `renderWithProviders`, `loginAs`, ข้อมูลปลอม |

## แม่แบบ CRUD

บทความเป็นตัวอย่าง CRUD ครบชุดหนึ่งตาราง ทำตารางใหม่ให้คัดลอกไฟล์ชุดนี้แล้วเปลี่ยนชื่อ/ฟิลด์

| ชั้น | ไฟล์ | ทำอะไร |
|---|---|---|
| ฐานข้อมูล | `db/schema.sql` | สร้างตาราง |
| store | [store/articles.go](store/articles.go) | SQL ล้วน ๆ ไม่รู้จัก HTTP หาไม่เจอคืน `ErrNotFound` |
| handler | [handler/articles.go](handler/articles.go) | อ่าน/ตรวจ JSON แปลง error เป็นเลขสถานะ |
| เส้นทาง | [routes.go](routes.go) | ผูก path กับ handler และด่านสิทธิ์ `login` / `maybe` / `admin` |
| สัญญา | [openapi.yaml](openapi.yaml) | หน้าตาคำขอและคำตอบ |
| เทสต์ API | [main_test.go](main_test.go) | 401/403/400/404 และสร้าง-อ่าน-แก้-ลบ ผ่านฐานข้อมูลจริง |
| หน้าเว็บ | [web/src/api/backend.js](web/src/api/backend.js) | ฟังก์ชันเรียก API |
| | [web/src/pages/Articles.jsx](web/src/pages/Articles.jsx), [ArticleDetail.jsx](web/src/pages/ArticleDetail.jsx) | หน้ารายการ + รายละเอียด |
| | [web/src/pages/admin/](web/src/pages/admin) | ตารางจัดการ + ฟอร์มเดียวใช้ทั้งสร้างและแก้ไข |
