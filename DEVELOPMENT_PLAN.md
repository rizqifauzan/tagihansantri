# Development Plan - Sistem Pencatatan Tagihan Santri

## 1. Tujuan Plan

Dokumen ini menerjemahkan PRD menjadi rencana implementasi teknis yang siap eksekusi untuk target: sistem internal admin, cloud (Vercel + NeonDB), dengan fokus efisiensi operasional.

## 2. Scope Implementasi

-   In scope:
-   Master data santri, kelas, komponen tagihan
-   Rule tagihan (global, kelas, gender, spesifik santri)
-   Generate tagihan bulanan otomatis + manual
-   Tagihan insidental
-   Diskon configurable per komponen (bersaudara/yatim/keluarga ndalem)
-   Pembayaran cicilan (tanpa minimum)
-   Kwitansi versi ringkas dan lengkap
-   Laporan bulanan + ekspor Excel dinamis
-   Out of scope awal:
-   Payment gateway
-   Portal wali santri
-   Notifikasi WA/SMS otomatis

## 3. Stack Teknis (Usulan)

-   Frontend: Next.js (App Router) + TypeScript
-   Backend: Next.js Route Handlers (API)
-   Database: PostgreSQL (NeonDB)
-   ORM: Prisma
-   Auth: NextAuth/Auth.js (credentials admin)
-   UI: shadcn/ui + Tailwind CSS
-   Export Excel: ExcelJS
-   Deploy: Vercel
-   Monitoring: Vercel Analytics + error logging (Sentry opsional)

## 4. Arsitektur Modul

-   Modul autentikasi admin
-   Modul master data (santri, kelas, komponen, keluarga)
-   Modul rule engine tagihan
-   Modul billing generator (scheduler + manual trigger)
-   Modul transaksi pembayaran
-   Modul kwitansi
-   Modul laporan dan ekspor
-   Modul audit trail

## 5. Rencana Sprint (8 Sprint, 1 Minggu/Sprint)

### Sprint 0 - Setup Proyek & Fondasi

-   Deliverables:
-   Inisialisasi repo, CI lint/test/build, environment setup
-   Setup NeonDB, Prisma schema baseline, migrasi awal
-   Setup auth admin dan role `ADMIN`
-   Exit criteria:
-   Aplikasi deploy ke Vercel (staging)
-   Login admin berfungsi

### Sprint 1 - Master Data Inti

-   Deliverables:
-   CRUD kelas
-   CRUD santri (dengan status aktif/nonaktif, gender, kelas)
-   CRUD komponen tagihan (bulanan/insidental)
-   Validasi form + pagination + pencarian
-   Exit criteria:
-   Data 300 santri bisa diinput/import dan tervalidasi

### Sprint 2 - Keluarga & Diskon Dasar

-   Deliverables:
-   Tabel keluarga + relasi `keluarga_id`
-   CRUD kategori diskon: bersaudara, yatim, keluarga ndalem
-   Konfigurasi diskon per komponen (persentase)
-   Rule resolusi diskon terbesar jika multi-eligible
-   Exit criteria:
-   Simulasi diskon menghasilkan nominal akhir sesuai aturan

### Sprint 3 - Rule Tagihan & Validasi Konflik

-   Deliverables:
-   CRUD rule cakupan: global, kelas, gender, spesifik santri
-   Validasi bentrok rule
-   Mekanisme status rule: `DRAFT`, `PUBLISHED`
-   Kebijakan bentrok: draft boleh, publish ditolak
-   Exit criteria:
-   Rule bentrok tidak bisa publish

### Sprint 4 - Generate Tagihan

-   Deliverables:
-   Generator bulanan otomatis tanggal 1
-   Tombol generate manual
-   Preview hasil generate (jumlah santri + total nominal)
-   Idempotensi/anti duplikasi (`santri_id + komponen_id + periode`)
-   Exit criteria:
-   Generate bulan berjalan sukses tanpa duplikasi

### Sprint 5 - Tagihan Insidental & Lifecycle Tagihan

-   Deliverables:
-   Buat tagihan insidental (massal/segmentasi/individual)
-   Lifecycle status tagihan: `DRAFT`, `TERBIT`, `SEBAGIAN`, `LUNAS`, `BATAL`
-   Aturan santri keluar: bulan berjalan tetap penuh, bulan setelah keluar tidak ditagih
-   Exit criteria:
-   Kasus insidental dan status lifecycle tervalidasi end-to-end

### Sprint 6 - Pembayaran, Cicilan, Kwitansi

-   Deliverables:
-   Input pembayaran tunai/transfer
-   Cicilan tanpa minimum hingga lunas
-   Kwitansi nomor otomatis
-   Template kwitansi ringkas + lengkap (dengan nama admin, logo/stempel)
-   Exit criteria:
-   Pembayaran parsial/multi-transaksi bekerja konsisten

### Sprint 7 - Laporan & Ekspor

-   Deliverables:
-   Laporan bulanan (1 sampai akhir bulan)
-   Laporan per tagihan, per gender, per komponen, tunggakan
-   Ekspor Excel dinamis (kolom bisa dipilih)
-   Exit criteria:
-   Semua laporan wajib tersedia dan dapat diekspor

### Sprint 8 - UAT, Hardening, Go-Live

-   Deliverables:
-   UAT dengan admin
-   Bug fixing prioritas tinggi
-   SOP operasional, backup, dan recovery
-   Cutover dari proses kertas ke sistem
-   Exit criteria:
-   1 siklus tagihan bulanan berjalan penuh tanpa blocker

## 6. Backlog Prioritas (MoSCoW)

-   Must:
-   Login admin
-   CRUD master data
-   Rule engine + validasi bentrok
-   Generate bulanan otomatis/manual
-   Pembayaran cicilan
-   Diskon per komponen + diskon terbesar
-   Kwitansi 2 versi
-   Laporan bulanan + ekspor Excel
-   Should:
-   Import batch data santri dari template
-   Dashboard ringkasan tunggakan
-   Audit log detail before/after
-   Could:
-   Reminder internal jatuh tempo
-   Preview cetak batch kwitansi
-   Won't (fase awal):
-   Payment gateway, portal wali, notifikasi WA

## 7. Data Model Minimum (Implementasi)

-   `users` (id, name, username, password_hash, role, active)
-   `kelas` (id, nama, active)
-   `keluarga` (id, kode_keluarga, nama_kepala_keluarga, keterangan)
-   `santri` (id, nis, nama, kelas_id, gender, keluarga_id, status, tanggal_masuk, tanggal_keluar)
-   `komponen_tagihan` (id, kode, nama, tipe, active)
-   `diskon_kategori` (id, nama, tipe, default_persen, fixed_persen_nullable)
-   `diskon_komponen` (id, komponen_id, kategori_id, persen)
-   `rule_tagihan` (id, komponen_id, scope_type, scope_ref, nominal, due_rule, status)
-   `tagihan` (id, santri_id, komponen_id, periode, nominal_awal, nominal_diskon, nominal_akhir, status, due_date)
-   `pembayaran` (id, tagihan_id, tanggal_bayar, nominal, metode, referensi)
-   `kwitansi` (id, nomor, pembayaran_id, tipe_template)
-   `audit_log` (id, actor_id, action, entity, entity_id, before_json, after_json, created_at)

## 8. Quality Plan

-   Testing:
-   Unit test rule engine (prioritas tinggi)
-   Integration test generate tagihan
-   Integration test diskon dan cicilan
-   E2E test alur utama admin
-   Quality gates:
-   Lint pass
-   Type check pass
-   Test coverage critical module >= 80%
-   No high-severity bug untuk go-live

## 9. Risiko Utama dan Mitigasi

-   Risiko: aturan diskon kompleks menyebabkan salah hitung
    
-   Mitigasi: test case matriks diskon + simulasi sebelum publish
    
-   Risiko: data awal dari kertas tidak konsisten
    
-   Mitigasi: template import + tahap verifikasi data sebelum go-live
    
-   Risiko: duplikasi tagihan karena proses generate berulang
    
-   Mitigasi: unique constraint + transaction lock
    

## 10. Definition of Done (Global)

-   Fitur sesuai acceptance criteria PRD
-   Terdokumentasi (cara pakai + batasan)
-   Lulus test minimum yang ditetapkan
-   Lulus UAT admin
-   Tidak ada blocker severity tinggi

## 11. Rencana Operasional Pasca Go-Live (2 Minggu)

-   Minggu 1:
-   Pendampingan harian input pembayaran
-   Monitoring error dan hotfix cepat
-   Minggu 2:
-   Audit laporan bulanan pertama
-   Handover SOP final

## 12. Keputusan yang Sudah Dikunci dari Hasil Klarifikasi

-   Sistem internal, hanya admin
-   Tagihan bulanan terbit otomatis tanggal 1 + manual trigger
-   Rule bentrok boleh draft, tidak boleh publish
-   Diskon configurable per komponen, multi diskon ambil terbesar
-   Cicilan bebas nominal
-   Tagihan santri keluar: bulan berjalan tetap penuh
-   Laporan periode bulanan kalender
-   Ekspor Excel dinamis