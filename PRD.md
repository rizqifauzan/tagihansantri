# PRD - Sistem Pencatatan Tagihan Santri

## 1. Ringkasan Produk
Sistem pencatatan tagihan santri adalah aplikasi untuk mengelola pembuatan, distribusi, dan pelunasan tagihan santri dengan dua tipe utama:
- Tagihan bulanan (berulang)
- Tagihan insidental (tidak berulang)

Sistem harus mendukung skema penerapan tagihan:
- Sama untuk semua santri
- Berbeda per kelas
- Berbeda per jenis kelamin

## 2. Latar Belakang & Masalah
Proses pencatatan tagihan santri sering dilakukan manual sehingga berisiko:
- Data tagihan tidak konsisten antar bagian administrasi
- Kesulitan melacak status pembayaran per santri
- Sulit membuat tagihan dengan aturan berbeda (kelas/jenis kelamin)
- Rekap tunggakan lambat dan rawan salah hitung

## 3. Tujuan Produk
- Mempermudah pembuatan tagihan massal dan individual
- Menjamin setiap santri menerima tagihan sesuai aturan yang berlaku
- Memudahkan pencatatan pembayaran dan pelacakan tunggakan
- Menyediakan laporan keuangan dan piutang santri secara cepat

## 4. Ruang Lingkup
### In Scope
- Master data santri, kelas, jenis kelamin
- Master komponen tagihan
- Pembuatan tagihan bulanan otomatis
- Pembuatan tagihan insidental manual
- Rule penerapan tagihan (semua santri / per kelas / per jenis kelamin)
- Pencatatan pembayaran (parsial/lunas)
- Riwayat transaksi tagihan
- Laporan tagihan, pembayaran, tunggakan

### Out of Scope (Fase 1)
- Integrasi payment gateway
- Notifikasi WhatsApp/SMS otomatis
- Aplikasi mobile native
- Integrasi akuntansi eksternal

## 5. Pemangku Kepentingan
- Bendahara/Admin Keuangan
- Pengurus/Pimpinan Pesantren
- Wali Santri (sebagai penerima informasi)
- Tim IT/Internal Operator

## 6. Persona Pengguna
### Admin Keuangan
Kebutuhan utama:
- Membuat tagihan cepat dengan aturan segmentasi
- Input pembayaran harian
- Melihat santri yang menunggak

### Pimpinan
Kebutuhan utama:
- Melihat ringkasan pemasukan dan tunggakan
- Memastikan kebijakan biaya diterapkan konsisten

## 7. Kebutuhan Fungsional
### 7.1 Manajemen Master Data
1. Sistem dapat menyimpan data santri: NIS, nama, kelas, jenis kelamin, status aktif.
2. Sistem dapat menyimpan data kelas.
3. Sistem dapat menyimpan komponen tagihan: kode, nama, tipe (bulanan/insidental), nominal default.

### 7.2 Rule Tagihan
1. Sistem mendukung rule cakupan tagihan:
- Global: berlaku untuk semua santri aktif
- Per kelas: berlaku untuk kelas tertentu
- Per jenis kelamin: berlaku untuk laki-laki/perempuan
2. Sistem mendukung prioritas rule saat overlap:
- Prioritas 1: Per kelas + jenis kelamin (paling spesifik)
- Prioritas 2: Per kelas
- Prioritas 3: Per jenis kelamin
- Prioritas 4: Global
3. Sistem menampilkan preview jumlah penerima tagihan sebelum diposting.

### 7.3 Tagihan Bulanan
1. Admin dapat membuat template tagihan bulanan.
2. Sistem dapat generate tagihan otomatis per periode (bulan-tahun).
3. Sistem mencegah duplikasi tagihan komponen yang sama pada periode yang sama untuk santri yang sama.
4. Admin dapat menjalankan generate ulang dengan opsi:
- Lewati data yang sudah ada
- Timpa draft (belum dibayar)

### 7.4 Tagihan Insidental
1. Admin dapat membuat tagihan insidental untuk:
- Seluruh santri
- Kelompok tertentu (kelas/jenis kelamin)
- Santri tertentu (individual)
2. Admin dapat menentukan tenggat pembayaran.

### 7.5 Pembayaran
1. Admin dapat mencatat pembayaran per tagihan.
2. Sistem mendukung pembayaran parsial.
3. Status tagihan: Draft, Terbit, Sebagian, Lunas, Batal.
4. Sistem menyimpan metode pembayaran (tunai/transfer/lainnya) dan nomor referensi.

### 7.6 Laporan
1. Laporan tagihan per periode.
2. Laporan pembayaran per periode.
3. Laporan tunggakan per kelas dan per santri.
4. Ekspor CSV/Excel untuk kebutuhan audit internal.

## 8. Aturan Bisnis
1. Tagihan hanya dapat diterbitkan untuk santri dengan status aktif.
2. Jika santri pindah kelas di tengah periode, aturan berlaku berdasarkan tanggal efektif tagihan.
3. Jika ada perubahan nominal komponen, perubahan hanya berlaku untuk tagihan baru (tidak retroaktif) kecuali admin melakukan penyesuaian manual.
4. Tagihan berstatus Lunas tidak bisa diubah, hanya bisa dilakukan pembalikan (void) dengan jejak audit.
5. Semua aksi penting (terbit tagihan, ubah nominal, void pembayaran) harus tercatat di audit log.

## 9. Kebutuhan Non-Fungsional
1. Keamanan:
- Role-based access (Admin Keuangan, Viewer Pimpinan)
- Setiap pengguna wajib login
2. Reliabilitas:
- Backup database harian
- Validasi input wajib di sisi server
3. Kinerja:
- Generate tagihan bulanan untuk 1.000 santri <= 30 detik
4. Auditabilitas:
- Semua perubahan finansial memiliki jejak waktu, user, dan nilai sebelum-sesudah

## 10. Model Data Inti (Konseptual)
- Santri(id, nis, nama, kelas_id, jenis_kelamin, status_aktif)
- Kelas(id, nama_kelas, tingkat)
- KomponenTagihan(id, kode, nama, tipe, nominal_default, aktif)
- RuleTagihan(id, komponen_id, cakupan, kelas_id nullable, jenis_kelamin nullable, nominal, prioritas)
- Tagihan(id, santri_id, komponen_id, periode, tipe, nominal, jatuh_tempo, status)
- Pembayaran(id, tagihan_id, tanggal_bayar, nominal_bayar, metode, referensi)
- AuditLog(id, user_id, aksi, entitas, entitas_id, before_json, after_json, created_at)

## 11. Alur Utama
### Alur A: Generate Tagihan Bulanan
1. Admin memilih periode bulanan.
2. Sistem mengambil semua rule aktif.
3. Sistem menghitung penerima berdasarkan prioritas rule.
4. Sistem menampilkan preview total santri dan total nominal.
5. Admin konfirmasi terbit.
6. Sistem membuat tagihan per santri.

### Alur B: Catat Pembayaran
1. Admin mencari santri/tagihan.
2. Admin input nominal bayar dan metode.
3. Sistem validasi nominal.
4. Sistem update status tagihan (Sebagian/Lunas).
5. Sistem simpan transaksi dan audit log.

## 12. Metrik Keberhasilan
1. Waktu pembuatan tagihan bulanan berkurang >= 70% dari proses manual.
2. Akurasi tagihan (tanpa koreksi manual) >= 98% per periode.
3. Waktu penyusunan laporan tunggakan <= 5 menit.
4. Penurunan kasus duplikasi tagihan hingga 0 kasus per periode.

## 13. Risiko & Mitigasi
1. Risiko: Data santri tidak lengkap/valid.
Mitigasi: Validasi wajib saat input + dashboard data anomali.

2. Risiko: Salah rule menyebabkan nominal tidak sesuai.
Mitigasi: Fitur preview + simulasi sebelum terbit.

3. Risiko: Konflik saat perubahan kebijakan biaya.
Mitigasi: Versioning rule dan tanggal efektif.

## 14. Rencana Fase Implementasi
Rencana berikut adalah usulan dari tim pengembang dan dapat direvisi setelah review.

1. Fase 1 - Fondasi Data & Setup Sistem
- Setup proyek aplikasi (Vercel) dan database (NeonDB)
- Desain skema database inti: santri, kelas, komponen, tagihan, pembayaran, user admin
- Modul autentikasi admin tunggal (login, logout, session)
- Master data dasar: CRUD santri, kelas, komponen tagihan
- Import data awal dari format manual ke template input sistem
- Kriteria selesai:
- Admin dapat login dan mengelola data master tanpa error kritis
- Data 300 santri aktif sudah masuk ke sistem

2. Fase 2 - Engine Tagihan Inti
- Rule tagihan: semua santri, per kelas, per jenis kelamin, dan spesifik santri
- Validasi konflik rule: boleh simpan draft, tidak bisa publish jika bentrok
- Generate tagihan bulanan otomatis tanggal 1 + tombol generate manual
- Tagihan insidental manual (maksimal cakupan per rule)
- Pencegahan duplikasi tagihan komponen pada periode sama
- Kriteria selesai:
- Tagihan bulan berjalan dapat terbit otomatis
- Tidak ada duplikasi tagihan untuk santri-komponen-periode yang sama

3. Fase 3 - Diskon, Cicilan, dan Aturan Lanjutan
- Tabel keluarga + relasi `keluarga_id` pada santri
- Diskon configurable per komponen (termasuk bersaudara, yatim, keluarga ndalem)
- Resolusi multi-diskon: ambil diskon terbesar
- Keluarga ndalem dengan nilai diskon tetap
- Cicilan bebas nominal hingga lunas
- Aturan santri keluar: tagihan bulan berjalan tetap penuh; setelah keluar tidak ditagih
- Kriteria selesai:
- Simulasi diskon menghasilkan nominal yang benar
- Pembayaran parsial dapat dilakukan berkali-kali hingga status lunas

4. Fase 4 - Pembayaran Operasional & Kwitansi
- Input pembayaran tunai/transfer (prioritas operasional tunai)
- Status tagihan otomatis: Terbit, Sebagian, Lunas
- Kwitansi 2 versi:
- Versi ringkas
- Versi lengkap
- Nomor kwitansi otomatis + nama admin + logo/stempel lembaga
- Audit trail transaksi pembayaran
- Kriteria selesai:
- Semua transaksi pembayaran tercatat dan bisa ditelusuri
- Kwitansi bisa dicetak untuk semua transaksi sukses

5. Fase 5 - Laporan dan Ekspor
- Laporan per bulan kalender (1 - akhir bulan)
- Laporan per tagihan, per gender, per komponen
- Laporan tunggakan santri
- Ekspor Excel dinamis (kolom bisa dipilih saat ekspor)
- Kriteria selesai:
- Seluruh laporan wajib tersedia dan sesuai kebutuhan admin
- Ekspor Excel valid untuk proses pelaporan bulanan

6. Fase 6 - UAT, Go-Live, dan Stabilisasi
- User Acceptance Test bersama admin keuangan
- Perbaikan bug dari hasil UAT
- Go-live produksi
- Masa stabilisasi operasional (monitoring, hotfix, backup rutin)
- Kriteria selesai:
- Proses tagihan bulanan berjalan penuh di sistem tanpa kembali ke kertas
- Tidak ada bug blocker pada 1 siklus penagihan bulanan

7. Usulan target waktu (dapat disesuaikan)
- Fase 1: 1-2 minggu
- Fase 2: 2-3 minggu
- Fase 3: 1-2 minggu
- Fase 4: 1 minggu
- Fase 5: 1 minggu
- Fase 6: 1-2 minggu
- Total estimasi: 7-11 minggu hingga stabil

## 15. Pertanyaan Klarifikasi untuk Finalisasi PRD
Silakan isi jawaban Anda di bawah tiap pertanyaan (format bebas, boleh singkat).

### 15.1 Visi, Tujuan, dan Prioritas
1. Apa tujuan utama sistem ini dalam 6-12 bulan pertama (efisiensi admin, transparansi wali, penurunan tunggakan, atau lainnya)?
Jawaban: Efiseinsi Admin

2. Siapa pemilik keputusan final PRD (jabatan/nama)?
Jawaban: Saya Developer 

3. Apa 3 masalah terbesar pada proses saat ini yang paling ingin diselesaikan dulu?
Jawaban: Input manual ke kertas, dan lama singkron data

### 15.2 Pengguna dan Hak Akses
4. Siapa saja peran pengguna sistem (admin keuangan, operator, pimpinan, wali santri, dll)?
Jawaban: Hanya admin 

5. Apakah wali santri akan login ke sistem, atau sistem hanya internal?
Jawaban: Sistem internal saja

6. Hak akses tiap role seperti apa (lihat, tambah, ubah, hapus, void, approve)?
Jawaban: Hanya admin

### 15.3 Data dan Segmentasi Santri
7. Berapa jumlah santri aktif saat ini dan proyeksi 1-2 tahun ke depan?
Jawaban: 300

8. Struktur kelas saat ini bagaimana (contoh: VII A, VII B; putra/putri terpisah atau campur)?
Jawaban: Kelas Jurumiyyah, Imrith, Alfiyyah 1, dll ( putra putri dicampur )

9. Apakah satu santri bisa masuk lebih dari satu kelompok penagihan (mis. kelas formal + diniyah + asrama)?
Jawaban: Ya

10. Selain kelas dan jenis kelamin, apakah ada segmentasi lain untuk penetapan tagihan (asrama, program, beasiswa, dll)?
Jawaban: Ada yang spesifik santri, ada yang majek makan, 

### 15.4 Definisi dan Komponen Tagihan
11. Definisi "tagihan insidental" di lembaga Anda apa saja? Beri contoh.
Jawaban: Ujian UTS, Tasyakuran Muharram

12. Komponen tagihan bulanan saat ini apa saja?
Jawaban: Hanya Syahriyyah

13. Tagihan insidental biasanya muncul seberapa sering?
Jawaban: max 6x per tahun

14. Apakah nominal bisa berbeda per santri walau berada pada rule yang sama?
Jawaban: Ada santri yang kena diskon karena bersaudara ( ada diskon 2 bersaudara, 3 bersaudara, 4 bersaudara, Yatim, dan keluarga ndalem)

15. Tagihan ditampilkan per komponen atau perlu invoice gabungan?
Jawaban: Per komponen

### 15.5 Kebijakan Keuangan
16. Apakah ada diskon/beasiswa/potongan? Jika ada, apa aturan perhitungannya?
Jawaban: Ya, diskon configrurable per tagihan biasanya dalam bentuk percentasi 

17. Apakah ada denda keterlambatan? Jika ada, bagaimana rumusnya?
Jawaban: Tidak ada

18. Apakah cicilan diperbolehkan? Jika ya, apa aturannya?
Jawaban: Ya, tidak ada aturan yang penting lunas

19. Jika santri masuk di tengah bulan, tagihan prorata atau tetap penuh?
Jawaban: Tetap penuh, kecuali tagihan bulanan ( bulan sebelum dia masuk, tidak perlu bayar )

20. Jika santri keluar/pindah kelas di tengah periode, bagaimana perlakuan tagihan?
Jawaban: Ditagih sampai saat dia keluar, tagihan setelah dia keluar, tidak perlu dibayar

### 15.6 Aturan Generate dan Prioritas Rule
21. Kapan tagihan bulanan diterbitkan (otomatis tanggal tertentu atau manual)?
Jawaban: Tanggal 1 tiap bulan ( ada tombol manualnya )

22. Bagaimana aturan jatuh tempo default dan pengecualiannya?
Jawaban: di konfigurasi tiap tagihan, 

23. Saat rule bentrok, apakah urutan prioritas ini disetujui: kelas+jenis kelamin > kelas > jenis kelamin > semua santri?
Jawaban: Dilarang bentrok

24. Apakah perlu proses persetujuan (approval) sebelum tagihan berstatus terbit?
Jawaban: Tidak

### 15.7 Pembayaran dan Rekonsiliasi
25. Metode pembayaran yang digunakan saat ini apa saja (tunai, transfer, QRIS, VA, lainnya)?
Jawaban: 98% tunai 2% transfer 

26. Apakah perlu fitur unggah bukti transfer?
Jawaban: Tidak

27. Rekonsiliasi bank dilakukan manual atau perlu otomatis?
Jawaban: Tidak perlu

28. Format bukti bayar/kwitansi apakah ada standar resmi lembaga?
Jawaban: dibuatkan saja

### 15.8 Laporan, Audit, dan Kepatuhan
29. Laporan wajib apa saja (harian, bulanan, tunggakan per kelas, per gender, per komponen, dll)?
Jawaban: Ya buat saja per bulan, per tagihan, per gender, per komponen

30. Format output wajib apa saja (Excel, CSV, PDF)?
Jawaban: Excell 

31. Seberapa detail audit trail yang dibutuhkan (siapa, kapan, sebelum/sesudah perubahan)?
Jawaban: Ya buat saja

32. Apakah ada kebijakan yayasan/regulasi tertentu yang wajib dipatuhi?
Jawaban: Tidak 

### 15.9 Implementasi dan Teknis
33. Saat ini proses berjalan di Excel/aplikasi lain? Apakah perlu migrasi data historis?
Jawaban: saat ini full di kertas

34. Sistem diinginkan berjalan di mana (cloud, server lokal, atau hybrid)?
Jawaban: cloud neonDB dan Vercel

35. Perlu dukungan multi-cabang atau cukup satu lembaga?
Jawaban: tidak perlu

36. Perlu dukungan multi-tahun ajaran dan penutupan buku per periode?
Jawaban: buat per tahun saja ( jan - Des)

37. Target go-live kapan, dan apakah ingin dibagi menjadi fase MVP lalu pengembangan lanjutan?
Jawaban: Bagi per fase

### 15.10 Pertanyaan Lanjutan (Presisi Aturan Bisnis)
38. Untuk diskon bersaudara, basis hitung diskon diterapkan ke komponen apa?
Jawaban: hampir semua komponen tagihan, itu konfigurable per konmponen ( mau di diskon berapa )

39. Diskon bersaudara berlaku otomatis berdasarkan data keluarga, atau dipilih manual oleh admin per santri?
Jawaban: Jadi ada table keluarga, nanti santri dengan keluarga_id yang sama di anggap bersaudara

40. Jika satu santri memenuhi lebih dari satu jenis diskon sekaligus (mis. yatim + bersaudara), apakah diskon ditumpuk atau hanya ambil diskon terbesar?
Jawaban: Ambil ter besar

41. Untuk kategori "keluarga ndalem", apakah nilai diskon tetap atau bisa berbeda per santri?
Jawaban: tetap

42. Jika admin mencoba membuat rule tagihan yang bentrok, sistem harus menolak simpan langsung atau boleh simpan draft namun tidak bisa dipublikasikan?
Jawaban: Buat draft boleh, publish tiddak 

43. Untuk santri yang keluar di tengah bulan, tagihan bulan berjalan tetap penuh atau perlu prorata?
Jawaban: Tagihan penuh

44. Pada pembayaran cicilan, apakah ada nominal minimal per transaksi atau bebas?
Jawaban: Bebas

45. Untuk bukti bayar/kwitansi, apakah perlu nomor otomatis, nama admin penagih, dan logo/stempel lembaga?
Jawaban: Ya perlu, buatkan saja beberapa versi, 
- Versi ringkas, 
- Versi komplet

46. Periode laporan bulanan mengikuti bulan kalender (1 sampai akhir bulan) atau periode custom?
Jawaban: 1 - akhir bulan

47. Untuk ekspor Excel, apakah format kolom harus template tetap atau bisa dipilih saat ekspor?
Jawaban: Ya Bisa dipilih saat ekspor (dinamis)?
