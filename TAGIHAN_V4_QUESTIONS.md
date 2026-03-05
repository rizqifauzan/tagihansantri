# Tagihan V4 - Pertanyaan Klarifikasi

## 1. Sumber data dan endpoint
1. Apakah `tagihan-v4` tetap memakai sumber data yang sama seperti `tagihan-v3` (GET `/api/tagihan-v2`)? Ya
2. Saat final submit, apakah tetap memakai endpoint pembayaran yang sama (`POST /api/tagihan/{id}/pembayaran`) dengan default metode `TUNAI`? Ya
3. Untuk aksi edit (ubah sisa), apakah tetap dikonversi menjadi nominal bayar berdasarkan selisih (`sisa lama - sisa baru`), seperti v3? Ya

## 2. Draft perubahan (belum tersimpan)
1. Saat user klik ikon lunas, apakah cell langsung ditandai sebagai draft perubahan (bukan tersimpan), dengan nilai `sisa draft = 0`? Ya
2. Saat user edit angka sisa, apakah nilai draft boleh dinaikkan lagi setelah sempat diturunkan (selama belum submit)? Ya
3. Apakah user bisa membatalkan perubahan per cell (misalnya klik ulang/reset) sebelum submit final? Ya
4. Jika user reload halaman sebelum submit, apakah semua draft perubahan boleh hilang? Jangan, simpan di local storage dulu

## 3. Highlight warna cell berubah
1. Anda minta background merah untuk data yang berubah. Apakah warna merah ini berlaku untuk:
   - semua perubahan (edit sisa maupun lunas), atau Ya
   - hanya perubahan yang belum tersubmit? Ya
2. Setelah submit sukses, apakah warna merah langsung hilang dan kembali ke warna normal? Ya

## 4. Tombol submit batch
1. Posisi tombol submit diinginkan di mana:
   - fixed bawah kanan,
   - di atas tabel,
   - atau di bawah tabel?
   fixed atas tabel
2. Format info tombol:
   - `X data berubah` + `Rp total diterima`, apakah benar? Benar Tambahkan juga total santri
3. Apakah tombol submit harus disabled jika tidak ada draft perubahan? Ya

## 5. Popup konfirmasi sebelum submit
1. Kolom popup konfirmasi sesuai request:
   - `No | NIS - Nama | Kelas | Nama Tagihan | Jumlah`
   Apakah perlu tambah kolom `Aksi` (Edit/Lunas) agar operator lebih jelas? Ya
2. Urutan data di popup mau berdasarkan:
   - urutan klik user,
   - urutan tampil di tabel,
   - atau urutan NIS? Urutan Nis
3. Di popup, apakah nilai `Jumlah` adalah nominal pembayaran yang akan dicatat (bukan sisa akhir)? Ya
4. Di popup, apakah tetap perlu ringkasan total di bawah tabel (`Total item`, `Total nominal`)? Ya ( tambahkan juga total santri)

## 6. Eksekusi submit
1. Saat konfirmasi submit, apakah prosesnya boleh dilakukan berurutan per item (loop API), atau harus paralel? lebih baik pararel
2. Jika sebagian sukses dan sebagian gagal, preferensi Anda:
   - simpan yang sukses, tampilkan daftar gagal,
   - atau rollback semua? rollback semua
3. Setelah submit sukses, apakah halaman:
   - auto refresh data penuh,
   - atau update lokal tanpa reload? refresh penuh

## 7. Konsistensi UX
1. Apakah `tagihan-v4` tetap mempertahankan semua fitur visual v3:
   - hover row+column,
   - sticky NIS/Nama/Kelas,
   - filter sidebar,
   - mode edit toggle? Ya
2. Di edit mode v4, apakah klik angka tetap membuka input inline seperti sekarang? Ya
3. Apakah ikon aksi lunas tetap `✓` seperti v3? Ya

## 8. Rule bisnis tambahan
1. Jika ada tagihan status `LUNAS`/`BATAL`, apakah tetap non-editable (sama v3)? Ya
2. Perubahan minimum nominal (misalnya kelipatan 1.000) perlu dipaksa atau bebas? bebas
3. Apakah perlu validasi tambahan di client sebelum masuk draft (mis. tidak boleh nilai negatif, tidak boleh lebih dari sisa lama)? Ya

## 9. Akses dan audit
1. Apakah perlu menampilkan siapa user admin yang sedang membuat draft batch sebelum submit? Ya
2. Apakah butuh catatan khusus di UI bahwa submit batch akan membuat banyak transaksi pembayaran sekaligus? Ya

## 10. Scope implementasi
1. Apakah saya buat route baru `app/tagihan-v4/page.tsx` + style reuse dari v3, tanpa mengubah `tagihan-v3`? Ya
2. Apakah menu sidebar perlu ditambah item baru `Laporan V4` yang menuju `/tagihan-v4`? Ya
3. Apakah perlu fallback jika API error di tengah submit (mis. tombol `Coba Lagi`)? Ya, dan tampilakan errornya

---

Silakan jawab per nomor agar implementasi `tagihan-v4` sesuai ekspektasi Anda 100%.
