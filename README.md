# Sprint 0 - Setup Proyek & Fondasi

Project ini menyiapkan fondasi untuk sistem pencatatan tagihan santri.

## Prasyarat
- Node.js 20+
- NPM 10+
- Database PostgreSQL (NeonDB)

## Setup
1. Copy env:
   - `cp .env.example .env`
2. Install dependency:
   - `npm install`
3. Generate prisma client:
   - `npm run db:generate`
4. Push schema ke database:
   - `npm run db:push`
5. Seed admin:
   - `npm run db:seed`
6. Jalankan aplikasi:
   - `npm run dev`

## Endpoint Dasar
- Health check: `GET /api/health`
- Login admin: `POST /api/auth/login`
- Logout admin: `POST /api/auth/logout`

## Sprint 0 Checklist
- [x] Struktur Next.js + TypeScript
- [x] Baseline Prisma schema
- [x] Auth admin dasar (session cookie)
- [x] CI lint/typecheck/build workflow
