# README2 - Dokumentasi Lengkap Proyek

## 1. Apa Itu Project Ini

Project ini adalah **Sistem Pencatatan Tagihan Santri** berbasis web untuk operasional admin pesantren/sekolah.

Fokus utamanya:
- Mengelola data master (santri, kelas, keluarga, user, komponen tagihan).
- Menyusun aturan tagihan.
- Membuat tagihan bulanan/insidental secara terstruktur.
- Mencatat pembayaran cicilan sampai lunas.
- Mencetak kwitansi pembayaran.

Stack utama:
- Next.js 15 (App Router) + TypeScript
- Prisma ORM
- PostgreSQL (NeonDB)

---

## 2. Masalah yang Diselesaikan

Sistem ini dibuat untuk mengganti proses manual (kertas/spreadsheet) agar:
- Tagihan tidak duplikat.
- Nominal tagihan bisa otomatis mengikuti aturan (kelas/gender/spesifik/santri baru).
- Diskon bisa dikonfigurasi dan dihitung otomatis.
- Status pembayaran bisa dipantau realtime (`DRAFT`, `TERBIT`, `SEBAGIAN`, `LUNAS`, `BATAL`).
- Riwayat pembayaran dan kwitansi terdokumentasi.

---

## 3. Fitur Utama (Lengkap)

### A. Autentikasi & Session
- Login admin via `POST /api/auth/login`.
- Logout via `POST /api/auth/logout`.
- Proteksi middleware:
  - Route `/dashboard/*` hanya untuk user login.
  - User yang sudah login tidak bisa akses `/login`.

### B. Master Data
- CRUD User admin (`/dashboard/users`, `/api/users`).
- CRUD Kelas (`/dashboard/kelas`, `/api/kelas`).
- CRUD Keluarga (`/dashboard/keluarga`, `/api/keluarga`).
- CRUD Santri (`/dashboard/santri`, `/api/santri`):
  - Menyimpan NIS, nama, kelas, gender, status, keluarga.
  - Atribut kelayakan diskon: `yatim`, `keluargaNdalem`.
  - Mendukung tanggal masuk/keluar.
- CRUD Komponen Tagihan (`/dashboard/komponen-tagihan`, `/api/komponen-tagihan`):
  - Tipe komponen: `BULANAN`, `INSIDENTAL`, `SANTRI_BARU`.

### C. Diskon
- CRUD Kategori Diskon (`/dashboard/diskon-kategori`, `/api/diskon-kategori`):
  - Rule eligibility: `SIBLING_FAMILY`, `SANTRI_YATIM`, `SANTRI_KELUARGA_NDALEM`.
- Konfigurasi Diskon per Komponen (`/dashboard/diskon-komponen`, `/api/diskon-komponen`).
- Simulasi Diskon (`/dashboard/simulasi-diskon`, `/api/diskon/simulasi`).
- Jika multi-eligible, sistem memilih **diskon terbesar**.

### D. Rule Tagihan
- CRUD Rule Tagihan (`/dashboard/rule-tagihan`, `/api/rule-tagihan`).
- Cakupan rule:
  - `GLOBAL`
  - `KELAS`
  - `GENDER`
  - `SANTRI`
- Workflow publish:
  - Draft boleh dibuat.
  - Publish/unpublish via endpoint khusus.
  - Validasi konflik dilakukan saat publish.

### E. Tagihan Master (Template Tagihan)
- Modul pembuatan tagihan di `/dashboard/tagihan-master` dan API `/api/tagihan-master`.
- Target penerapan tagihan:
  - `SEMUA_SANTRI`
  - `GENDER`
  - `KELAS`
  - `SPESIFIK_SANTRI`
  - `SANTRI_BARU`
- Status master: `SCHEDULED`, `ACTIVE`, `ENDED`, `INACTIVE`.
- Mendukung:
  - Nominal global/per gender/per kelas/per santri.
  - Jatuh tempo.
  - Nama tagihan.
  - Auto generate.
  - Publish master.
  - Preview sebelum generate.

### F. Generate Tagihan
- Preview generate: `POST /api/tagihan-master/[id]/preview`.
- Generate manual: `POST /api/tagihan-master/[id]/generate`.
- Auto-run cron: `GET|POST /api/tagihan-master/auto-run`.
- Idempotent/anti duplikasi melalui unique key:
  - `@@unique([santriId, komponenId, periodeKey])`
  - plus `createMany({ skipDuplicates: true })`.
- Untuk komponen `SANTRI_BARU`, sistem auto-apply tagihan untuk santri baru aktif.

### G. PIC Tagihan
- Penanggung jawab tagihan (PIC) dapat diatur:
  - `GLOBAL`
  - `BY_GENDER`
  - `BY_KELAS`
- PIC tersimpan di `TagihanMaster` dan diturunkan ke masing-masing tagihan.

### H. Lifecycle Tagihan
- Monitoring tagihan per santri: `/dashboard/tagihan`, `/api/tagihan`.
- Ubah status: `PATCH /api/tagihan/[id]/status`.
- Status didukung: `DRAFT`, `TERBIT`, `SEBAGIAN`, `LUNAS`, `BATAL`.

### I. Pembayaran & Cicilan
- Input pembayaran per tagihan: `POST /api/tagihan/[id]/pembayaran`.
- Riwayat pembayaran tagihan: `GET /api/tagihan/[id]/pembayaran`.
- Alternatif endpoint bayar: `POST /api/tagihan/[id]/bayar`.
- Mendukung cicilan multi-transaksi tanpa minimum nominal.
- `nominalTerbayar` diakumulasi otomatis.
- Status otomatis berubah ke `SEBAGIAN`/`LUNAS`.

### J. Kwitansi
- List pembayaran: `GET /api/pembayaran`.
- Kwitansi pembayaran: `GET /api/pembayaran/[id]/kwitansi?template=RINGKAS|LENGKAP`.
- Nomor kwitansi otomatis (format prefix `KWT-...`).
- Template:
  - Ringkas
  - Lengkap
- Dukungan branding via env:
  - `RECEIPT_LOGO_URL`
  - `RECEIPT_STAMP_URL`

### K. Matrix Tagihan
- Dashboard matrix: `/dashboard/tagihan-matrix`.
- API: `GET /api/tagihan-matrix`.
- Fitur matrix:
  - Header komponen + periode.
  - Filter status bayaran (`ALL`, `LUNAS`, `BELUM_LUNAS`).
  - Sort (`NIS`, `KELAS`, `JUMLAH_TAGIHAN`).
  - Count view (`JUMLAH_TAGIHAN`, `SUDAH_DIBAYAR`, `BELUM_DIBAYAR`, `SEMUA`).
  - Ringkasan nominal awal, diskon, tagihan, terbayar, sisa.

---

## 4. Halaman Dashboard yang Tersedia

- `/dashboard`
- `/dashboard/users`
- `/dashboard/kelas`
- `/dashboard/keluarga`
- `/dashboard/santri`
- `/dashboard/komponen-tagihan`
- `/dashboard/diskon-kategori`
- `/dashboard/diskon-komponen`
- `/dashboard/simulasi-diskon`
- `/dashboard/rule-tagihan`
- `/dashboard/tagihan-master`
- `/dashboard/tagihan`
- `/dashboard/tagihan-matrix`
- `/dashboard/pembayaran`

---

## 5. Daftar API Endpoint

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Health
- `GET /api/health`

### Users
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/[id]`
- `DELETE /api/users/[id]`

### Kelas
- `GET /api/kelas`
- `POST /api/kelas`
- `PUT /api/kelas/[id]`
- `DELETE /api/kelas/[id]`

### Keluarga
- `GET /api/keluarga`
- `POST /api/keluarga`
- `PUT /api/keluarga/[id]`
- `DELETE /api/keluarga/[id]`

### Santri
- `GET /api/santri`
- `POST /api/santri`
- `PUT /api/santri/[id]`
- `DELETE /api/santri/[id]`

### Komponen Tagihan
- `GET /api/komponen-tagihan`
- `POST /api/komponen-tagihan`
- `PUT /api/komponen-tagihan/[id]`
- `DELETE /api/komponen-tagihan/[id]`

### Diskon Kategori
- `GET /api/diskon-kategori`
- `POST /api/diskon-kategori`
- `PUT /api/diskon-kategori/[id]`
- `DELETE /api/diskon-kategori/[id]`

### Diskon Komponen
- `GET /api/diskon-komponen`
- `POST /api/diskon-komponen`
- `PUT /api/diskon-komponen/[id]`
- `DELETE /api/diskon-komponen/[id]`

### Simulasi Diskon
- `POST /api/diskon/simulasi`

### Rule Tagihan
- `GET /api/rule-tagihan`
- `POST /api/rule-tagihan`
- `PUT /api/rule-tagihan/[id]`
- `DELETE /api/rule-tagihan/[id]`
- `POST /api/rule-tagihan/[id]/publish`
- `POST /api/rule-tagihan/[id]/unpublish`

### Tagihan Master
- `GET /api/tagihan-master`
- `POST /api/tagihan-master`
- `PUT /api/tagihan-master/[id]`
- `DELETE /api/tagihan-master/[id]`
- `POST /api/tagihan-master/[id]/publish`
- `POST /api/tagihan-master/[id]/preview`
- `POST /api/tagihan-master/[id]/generate`
- `GET|POST /api/tagihan-master/auto-run`

### Tagihan
- `GET /api/tagihan`
- `PATCH /api/tagihan/[id]/status`
- `GET /api/tagihan/[id]/pembayaran`
- `POST /api/tagihan/[id]/pembayaran`
- `POST /api/tagihan/[id]/bayar`

### Pembayaran
- `GET /api/pembayaran`
- `GET /api/pembayaran/[id]/kwitansi`

### Matrix
- `GET /api/tagihan-matrix`

---

## 6. Data Model Inti

Entitas utama:
- `User`
- `Kelas`
- `Keluarga`
- `Santri`
- `KomponenTagihan`
- `DiskonKategori`
- `DiskonKomponen`
- `RuleTagihan`
- `TagihanMaster`
- `TagihanMasterDetail`
- `TagihanMasterPicKelas`
- `Tagihan`
- `Pembayaran`
- `Kwitansi`
- `TagihanGenerateLog`

Relasi penting:
- Satu `Santri` berada di satu `Kelas`, opsional satu `Keluarga`.
- `DiskonKomponen` menghubungkan komponen tagihan dengan kategori diskon.
- `Tagihan` dihasilkan dari `TagihanMaster` dan terkait ke `Santri` + `KomponenTagihan`.
- `Pembayaran` terkait ke satu `Tagihan`.
- `Kwitansi` terkait ke satu `Pembayaran`.

---

## 7. Setup Lokal

Prasyarat:
- Node.js 20+
- npm 10+
- PostgreSQL (disarankan NeonDB)

Langkah:
1. Copy env:
   - `cp .env.example .env`
2. Install dependency:
   - `npm install`
3. Generate Prisma client:
   - `npm run db:generate`
4. Push schema:
   - `npm run db:push`
5. Seed data awal (admin + default kategori diskon):
   - `npm run db:seed`
6. Jalankan server dev:
   - `npm run dev`

---

## 8. Environment Variables

Wajib:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Opsional:
- `APP_NAME`
- `CRON_SECRET`
- `RECEIPT_LOGO_URL`
- `RECEIPT_STAMP_URL`

---

## 9. Script NPM Penting

- `npm run dev` -> jalankan dev server
- `npm run build` -> build production
- `npm run start` -> run production server
- `npm run lint` -> lint check
- `npm run typecheck` -> TypeScript check
- `npm run db:generate` -> generate Prisma client
- `npm run db:push` -> push schema ke DB
- `npm run db:migrate` -> migrate DB (dev)
- `npm run db:seed` -> seed data awal
- `npm run db:reset` -> reset database
- `npm run db:reset:seed` -> reset + seed
- `npm run db:backfill-zero-lunas` -> backfill tagihan nominal 0 jadi lunas
- `npm run db:backfill-tagihan-snapshot` -> backfill snapshot nominal tagihan

---

## 10. Catatan Implementasi Saat Ini

- Sistem didesain untuk internal admin (single role aktif: `ADMIN`).
- Scheduler Vercel untuk auto-run tagihan sudah disiapkan di `vercel.json`.
- Belum ada automated test suite (script `npm test` masih placeholder).
- Dokumentasi ini menggambarkan fitur yang sudah ada di codebase saat ini.
