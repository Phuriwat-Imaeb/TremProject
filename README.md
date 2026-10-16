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
`admin@petfinder.test` (admin), `rescue@petfinder.test` (rescuer),
`nida@example.com` และ `ton@example.com` (member)

## ตัวแปรระบบ

| ชื่อ | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ✔ | ที่อยู่ฐานข้อมูล PostgreSQL |
| `JWT_SECRET` | ✔ | กุญแจเซ็นตั๋ว ยาวอย่างน้อย 32 ตัวอักษร |
| `ALLOWED_ORIGINS` | | origin ของหน้าเว็บ คั่นด้วยจุลภาค เช่น `http://localhost:3000,https://xxx.vercel.app` |
| `PORT` | | port ที่เปิดรอ (ไม่ตั้ง = 8080, Render ตั้งให้เอง) |

## เทสต์

```bash
go test ./...
cd web && npm test
```

GitHub Actions รัน gofmt, go vet, build, schema/seed และเทสต์ของ Go กับเทสต์ + build ของหน้าเว็บ ให้ทุกครั้งที่ push ขึ้น `main`

## เส้นทางที่ทำแล้ว

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me`
- `GET /api/species`, `GET /api/areas`

## หน้าเว็บที่ทำแล้ว

- `/login`, `/register` สมัครเสร็จจะเข้าสู่ระบบให้ทันที
- `/me` ข้อมูลบัญชี (ต้องเข้าสู่ระบบก่อน ไม่งั้นจะถูกพาไป `/login` แล้วกลับมาหน้าเดิมหลังเข้าสู่ระบบ)
