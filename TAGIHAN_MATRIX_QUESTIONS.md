# Pertanyaan Klarifikasi Tampilan Semua Tagihan (Matrix/Pivot)

1. Halaman target
- Ini mau di halaman baru (mis. `/dashboard/tagihan-matrix`) atau mengganti tampilan `/dashboard/tagihan` yang sekarang?
Halaman Baru

2. Definisi filter status
- `Hanya yang lunas`: hanya `status = LUNAS`?
- `Hanya yang sudah dibayar`: pakai `nominalTerbayar > 0` (termasuk `SEBAGIAN` dan `LUNAS`)? Ya, dia
- `Hanya yang belum lunas`: apakah tepatnya `status IN (TERBIT, SEBAGIAN)`?
- `BATAL` dan `DRAFT` mau masuk filter mana? Buat filer batal dan draft sendiri
- Buat filer dengan mengecualikan batal dan draft



3. Struktur kolom header (pivot)
- Benar formatnya:
  - Group level 1: `Komponen Tagihan`
  - Group level 2: `Tagihan per periode` (`periodeKey`)
  - Isi sel: nominal tagihan per santri pada kombinasi komponen+periode?
- Perlu tampil juga sub-info di header: `status`, `nominalTerbayar`, `jatuhTempo`? Tidak perlu

4. Cakupan periode
- Mau tampil periode berapa? (mis. 1 bulan, 3 bulan, 12 bulan, custom dari–sampai) default semua 
- Default periodenya apa? default semua periode

5. Isi sel per santri
- Kalau satu santri tidak punya tagihan di kolom itu, tampil `-` atau `0`? tidak ada tagihan tulis `-`
- Kalau ada data duplikat tak terduga, mau dijumlahkan atau ambil terbaru? tulis pakai comma `data-1`, `data-2`

6. Urutan data
- Urut baris santri: `NIS ASC`?
- Urut kolom: komponen berdasarkan `kode/nama`, lalu periode ascending?
- Tambahkan kemampuan urut berdasarkan kelas
- Tambahkan kemampuan urut berdasarkan jumlah tagihan 

7. Performance
- Data santri bisa besar. Mau pakai pagination baris santri (mis. 50/baris) atau tampil semua sekaligus? Tampil semua sekaligus
- Perlu sticky header + sticky kolom `NIS/Nama`? Ya

8. Tambahan output
- Perlu kolom total per santri (`total tagihan`, `total terbayar`, `sisa`)? Ya
- Perlu tombol export Excel/CSV? saat ini tidak
