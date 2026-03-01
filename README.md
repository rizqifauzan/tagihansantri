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

## Sprint 4 - Generate Tagihan
- Preview generate: `POST /api/tagihan-master/:id/preview`
- Generate manual: `POST /api/tagihan-master/:id/generate` (wajib `confirmed: true`)
- Auto generate bulanan: `GET|POST /api/tagihan-master/auto-run`
  - Cron dijadwalkan harian lewat `vercel.json`
  - Route akan eksekusi generate hanya saat **tanggal 1 WIB**
  - Untuk akses cron, isi env `CRON_SECRET` (Bearer token)
- Anti duplikasi dijaga oleh:
  - unique constraint `@@unique([santriId, komponenId, periodeKey])`
  - `createMany({ skipDuplicates: true })`

## Sprint 5 - Tagihan Insidental & Lifecycle Tagihan
- Insidental dibuat dari `Tagihan Master` komponen tipe `INSIDENTAL` + target:
  - `SEMUA_SANTRI` (massal)
  - `GENDER` / `KELAS` (segmentasi)
  - `SPESIFIK_SANTRI` (individual)
- Saat generate insidental, tagihan dibuat sebagai `DRAFT`.
- Lifecycle status tagihan:
  - `PATCH /api/tagihan/:id/status` dengan status: `DRAFT`, `TERBIT`, `SEBAGIAN`, `LUNAS`, `BATAL`
  - `POST /api/tagihan/:id/pembayaran` untuk update `nominalTerbayar` dan status otomatis `SEBAGIAN/LUNAS`
- Monitoring operasional:
  - `GET /api/tagihan`
  - UI: `/dashboard/tagihan`
- Aturan santri keluar bulanan:
  - Bulan keluar tetap ditagih penuh.
  - Bulan setelah keluar tidak ikut target generate.

## Sprint 6 - Pembayaran, Cicilan, Kwitansi
- Input pembayaran tunai/transfer:
  - `POST /api/tagihan/:id/pembayaran`
  - `GET /api/tagihan/:id/pembayaran`
- Cicilan tanpa minimum:
  - Setiap pembayaran disimpan sebagai transaksi terpisah (`multi-transaksi`)
  - `nominalTerbayar` diakumulasi otomatis
  - Status tagihan otomatis `SEBAGIAN` / `LUNAS`
- Kwitansi nomor otomatis:
  - Dibuat otomatis setiap transaksi pembayaran
  - Endpoint list: `GET /api/pembayaran`
  - Endpoint template kwitansi: `GET /api/pembayaran/:id/kwitansi?template=RINGKAS|LENGKAP`
- Template kwitansi:
  - Ringkas dan lengkap
  - Memuat nama admin
  - Mendukung logo/stempel via env: `RECEIPT_LOGO_URL`, `RECEIPT_STAMP_URL`
- UI:
  - `/dashboard/tagihan` untuk bayar per tagihan
  - `/dashboard/pembayaran` untuk daftar pembayaran + preview kwitansi

## Sprint 0 Checklist
- [x] Struktur Next.js + TypeScript
- [x] Baseline Prisma schema
- [x] Auth admin dasar (session cookie)
- [x] CI lint/typecheck/build workflow
