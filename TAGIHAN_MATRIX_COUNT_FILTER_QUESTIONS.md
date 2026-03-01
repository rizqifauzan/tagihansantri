# Klarifikasi Opsi Tampilan Hitungan di Matrix Tagihan

Tujuan: memastikan implementasi opsi:
- Jumlah tagihan
- Jumlah tagihan yang sudah dibayarkan
- Jumlah tagihan yang belum dibayarkan
- Semua

1. Opsi ini dipakai untuk apa?
- A. Filter data di sel matrix (nilai sel yang ditampilkan berubah)
- B. Filter baris santri (santri yang tidak memenuhi disembunyikan)
- C. Hanya mengubah kolom ringkasan hitungan di kanan (tanpa mengubah sel matrix)

Jawaban : Filter ini digunakan untuk melihat 
1. Tagihan yang sudah dibayar itu apa saja, dan berapa nominalnya ( per tagihan )
2. Tagihan yang belum dibayar itu apa saja dan berapa nominalnya ( per tagihan )

2. Definisi hitungan (mohon konfirmasi)
- `Jumlah tagihan` = jumlah item tagihan (count semua tagihan yang lolos filter status) 
- `Jumlah tagihan yang sudah dibayarkan` = count tagihan dengan `nominalTerbayar > 0`
- `Jumlah tagihan yang belum dibayarkan` = count tagihan dengan `nominalTerbayar = 0`
- `Semua` = tampil semua hitungan (3 kolom sekaligus)
Ya betul

3. Lokasi kontrol opsi
- A. Dropdown baru di atas tabel
- B. Tab/button group di atas tabel
- C. Opsi lain (jelaskan)
Jawaban:  A. Dropdown baru di atas tabel


4. Dampak ke kolom kanan tabel
- Saat pilih salah satu opsi, apakah:
  - A. Hanya tampil 1 kolom hitungan sesuai opsi
  - B. Tetap tampil semua kolom hitungan
  - C. Untuk opsi `Semua` tampil semua, opsi lain tampil 1 kolom saja

  Jawban : C. Untuk opsi `Semua` tampil semua, opsi lain tampil 1 kolom saja


5. Apakah opsi ini digabung dengan filter status yang sudah ada?
- A. Ya, dihitung setelah filter status aktif diterapkan
- B. Tidak, hitungan selalu dari semua data tanpa melihat filter status

Jawaban : - A. Ya, dihitung setelah filter status aktif diterapkan


6. Label kolom yang diinginkan (final)
- Contoh:
  - `Semua Tagihan`
  - `Sudah Dibayar`
  - `Belum Dibayar`


7. Default saat halaman dibuka
- Pilihan default:
- Tagihan yang belum dibayar
