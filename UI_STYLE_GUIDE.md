# UI Style Guide - Sistem Tagihan Santri

Panduan ini menjadi acuan visual dan interaksi untuk web admin React + Tailwind/CSS saat ini.

## 1. Prinsip Desain
- Fokus produktivitas admin: padat informasi, tetap ringan dibaca.
- Prioritaskan data penting di area atas (ringkasan, status, aksi utama).
- Hindari dekorasi berlebihan; gunakan visual hanya jika membantu pengambilan keputusan.
- Konsisten antar modul: struktur header, toolbar, card, table, modal, toast.

## 2. Tema
Tema aktif diset lewat `html[data-theme]` dan dipilih dari dropdown profil.

Pilihan:
- `pesantren-formal` (default): hijau natural + aksen emas lembut.
- `pesantren-modern`: hijau lebih fresh dengan kontras sedikit lebih tinggi.

Token utama didefinisikan di `app/globals.css`:
- `--primary`, `--primary-soft`, `--primary-dark`
- `--accent`, `--accent-soft`
- `--bg`, `--surface`, `--surface-soft`
- `--text`, `--muted`, `--line`, `--line-soft`

## 3. Tipografi dan Spacing
- Font utama: `Plus Jakarta Sans` (di root layout).
- Ukuran dasar desktop: `14px`, mobile: `13px`.
- Heading:
  - `h2` untuk judul halaman
  - `h3` untuk judul section/card
- Jarak standar:
  - antar section halaman: `14px`
  - padding card: `12px` desktop, `10px` mobile

## 4. Pola Layout Halaman
Gunakan pola berikut di setiap halaman dashboard:
1. `section.dashboard-main`
2. `header.page-head` berisi `h2 + deskripsi singkat`
3. Konten utama dibungkus `Card`
4. Toolbar filter/search di atas tabel
5. Tabel/list data
6. Pagination atau status data

## 5. Komponen Reusable
Komponen berada di `app/dashboard/_components`:
- `Card`, `Tabs`, `Popover`, `Modal`, `EmptyState`, `DateRangeSelect`, `StatBlock`
- `ToastProvider` + `useToast`
- `LineChart`, `BarChart`

Gunakan komponen ini sebelum membuat komponen baru agar konsistensi terjaga.

## 6. State Interaksi
- Hover row tabel: highlight halus (`tbody tr:hover`).
- Active menu sidebar: background soft + indicator bar kiri.
- Popover:
  - non-blocking
  - tutup saat klik luar
- Modal:
  - blocking
  - tombol utama `Simpan`, sekunder `Batal`
  - bisa tutup dengan `Esc`
- Toast:
  - sudut kanan bawah (mobile full-width)
  - tone: `success`, `warning`, `error`
  - auto-dismiss

## 7. Tabel dan Data Dense UI
- Gunakan pemisah halus (`--line-soft`).
- Header tabel ringan, tidak terlalu tebal visualnya.
- Untuk aksi banyak, gunakan `row-actions`.
- Untuk multi-select, tampilkan `bulk-bar` saat ada item dipilih.
- Gunakan `table-compact` untuk mode kompak.

## 8. Responsif
Breakpoint utama:
- `<= 1024px`: layout sidebar menjadi stack.
- `<= 760px`: form 1 kolom, toolbar full-width, toast full-width, tabel lebih compact.

## 9. Microcopy
Standar copy:
- Judul: singkat dan berbasis domain (`Data Santri`, `Hak Akses`).
- Deskripsi: 1 kalimat, menjelaskan tujuan halaman.
- Tombol aksi:
  - Primer: kata kerja langsung (`Simpan`, `Tambah`, `Filter`)
  - Sekunder: `Batal`, `Reset`
- Empty state:
  - headline singkat
  - alasan/arah tindakan
  - CTA jelas

## 10. Batasan Implementasi
- Jangan ubah flow bisnis, API, validasi backend, atau state domain.
- Optimistic UI hanya di layer tampilan, dengan rollback saat error.
- Jika menambah visual baru, pastikan tetap memenuhi aksesibilitas dasar (kontras, focus, keyboard escape untuk modal).
