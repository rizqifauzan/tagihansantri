# Pertanyaan Sebelum Duplikasi Halaman Matrix Tagihan

Halo! Saya telah meninjau kode untuk halaman Matrix Tagihan. Sebelum saya mulai menduplikasi dan memodifikasi halaman tersebut, ada beberapa hal yang ingin saya pastikan agar hasilnya sesuai dengan keinginan kamu:

### 1. Route/URL Halaman Baru
Halaman yang sekarang ada di `/dashboard/tagihan-matrix`. 
Apa nama URL untuk halaman baru yang di-duplicate ini? 
*Contoh: `/dashboard/tagihan-matrix-custom` atau `/dashboard/laporan-tagihan-pic`?*
Jawaban : /dashboard/tagihan-v2


### 2. Filter by Nama
Di halaman lama sudah ada filter search yang mencari NIS/Nama/Kelas. 
Apakah filter "Nama" yang baru ini tetap berupa **input teks** (search) tapi khusus untuk nama saja, atau kamu ingin berupa **dropdown list** nama-nama santri?
Jawaban : pakai free text, dan user input nama

### 3. Filter by Tagihan (Checkbox)
Untuk filter tagihan menggunakan checkbox:
- Apakah yang dimaksud adalah memfilter berdasarkan **Komponen Tagihan** (seperti SPP, Pendaftaran, dll)? Ya
- Jika iya, apakah semua komponen tagihan yang aktif harus ditampilkan sebagai daftar checkbox? Ya

### 4. Filter by PIC
Terkait filter PIC (Person In Charge):
- Apakah filter ini berupa **dropdown list** berisi nama-nama User/Admin yang menjadi PIC?
Jawaban : Pakai Checkbox
- Apakah kita akan memfilter tagihan berdasarkan `picUserId` yang ada di data Tagihan?
Jawaban : Ya

### 5. Penghapusan Filter Lama
Kamu meminta untuk menghapus filter yang sekarang. Berarti filter berikut akan saya hilangkan:
- Filter Status (Lunas, Belum Lunas, dll)
- Filter Urutan (Sort NIS/Kelas/Jumlah Tagihan)
- Filter Tampilan (Jumlah Tagihan/Sudah Dibayar/Belum Dibayar)
- Filter Arah Urutan (Naik/Turun)
Jawaban : Ya

Apakah yakin semua itu ingin dihapus atau ada yang ingin tetap dipertahankan?
Jawaban : Ya

### 6. API Endpoint
Apakah saya sebaiknya membuat API baru (misal: `/api/tagihan-matrix-custom`) atau memodifikasi API yang sudah ada agar mendukung filter-filter baru ini? (Saran saya membuat API baru agar tidak mengganggu halaman matrix yang lama).

Jawaban : Buat api End point baru `/api/tagihan-v2`

---
Silakan berikan jawabanmu, dan saya akan segera mengeksekusi kodenya!
