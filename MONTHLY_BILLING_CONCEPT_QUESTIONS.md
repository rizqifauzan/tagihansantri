# Klarifikasi Konsep Tagihan Bulanan Berjangka

Silakan isi `Jawaban:` di bawah setiap pertanyaan.

## 1. Waktu dan Scheduler
1. Generate bulanan otomatis dijalankan berdasarkan timezone apa?
- Asia/Jakarta (WIB)
- Timezone server
- Lainnya
Jawaban: Asia/Jakarta (WIB)

2. Jika scheduler gagal pada tanggal 1 (misal server down), apakah saat server hidup lagi harus melakukan catch-up bulan berjalan?
Jawaban: Admin bisa generate pakai button

3. Butuh log hasil generate otomatis per bulan (jumlah sukses/gagal)?
Jawaban: Yes 

## 2. Struktur Master Bulanan
4. Untuk master tagihan bulanan, apakah field periodenya diubah menjadi rentang:
- startBulan/startTahun
- endBulan/endTahun
Jawaban: Ya

5. Apakah `end` boleh kosong (berlaku tanpa batas) atau wajib diisi?
Jawaban: Wajib diisi 

6. Jika sudah melewati `end`, status master harus jadi apa?
- auto selesai/nonaktif
- tetap aktif tapi diabaikan scheduler
Jawaban: ENDED

7. Perlu status kontrol master bulanan seperti `ACTIVE`, `PAUSED`, `ENDED`?
Jawaban: Ya, `ACTIVE`, `SCHEDULLED`, `ENDED`, "NON AKTIF"

## 3. Aturan Generate
8. Jika master dibuat di tengah bulan (contoh 15 Maret), apakah periode Maret langsung digenerate saat itu atau menunggu tanggal 1 bulan berikutnya?
Jawaban: maret boleh digenerate secara manual ( admn click button )

9. Jika ada duplikasi `santri+komponen+periode` saat auto-generate, kebijakannya apa?
- error total
- skip duplikat dan lanjut
- rollback total
Jawaban: skip duplikat dan lanjut

10. Snapshot target santri diambil kapan?
- pada saat generate tanggal 1 (snapshot saat itu)
- mengikuti data saat master dibuat
Jawaban: pada saat generate tanggal 1

## 4. Perubahan Data Setelah Master Dibuat
11. Jika nominal master diubah di tengah jalan, perubahan berlaku mulai kapan?
- bulan berikutnya
- bulan berjalan jika belum tergenerate
- lainnya
Jawaban: bulan berjalan jika belum tergenerate

12. Jika rule target (gender/kelas/spesifik) diubah di tengah jalan, perubahan berlaku mulai kapan?
Jawaban: bulan berjalan jika belum tergenerate

13. Jika santri pindah kelas setelah tanggal 1, apakah tagihan bulan itu tetap mengikuti snapshot saat tanggal 1?
Jawaban: bulan berjalan jika belum tergenerate

## 5. Hubungan dengan Tagihan Insidental
14. Tagihan insidental tetap manual publish (tanpa auto scheduler), benar?
Jawaban: Benar

15. Untuk insidental, konsep start-end bulanan tidak dipakai, benar?
Jawaban: Benar

## 6. Acceptance Criteria
16. Tolong tulis versi sukses Sprint untuk konsep baru ini (minimal 3 poin kondisi berhasil).
Jawaban:  semua kondisi dari pertanyaan 1 sampai 15 selesai dikerjakan dengan benar

## 7. Klarifikasi Final (Wajib Dikunci)
17. Mohon konfirmasi enum status master bulanan final (pilih yang baku, huruf kapital):
- ACTIVE
- SCHEDULED
- ENDED
- INACTIVE
Atau tulis versi final Anda sendiri.
Jawaban: - ACTIVE
- SCHEDULED
- ENDED
- INACTIVE



18. Apa perbedaan `ACTIVE` vs `SCHEDULED` dan kapan transisinya?
Contoh yang bisa dipakai:
- SCHEDULED: master sudah dibuat tapi belum masuk bulan start.
- ACTIVE: sudah masuk rentang start-end dan siap auto-generate.
Jawaban: Ya betul

19. Konfirmasi aturan snapshot final:
- Jika bulan berjalan **sudah tergenerate**, perubahan kelas/gender/nominal **tidak mengubah** tagihan bulan itu.
- Jika bulan berjalan **belum tergenerate**, generate manual memakai data terbaru saat tombol generate ditekan.
Apakah ini benar?
Jawaban: Ya benar

20. Manual generate oleh admin berlaku untuk:
- hanya bulan berjalan
- atau bisa pilih bulan tertentu dalam rentang start-end
Jawaban: Bisa keduanya 

Catatan tambahan
Fitur autogenerate ( untuk tagihan bulanan )
bisa On Off,
jadi kalau on maka fitur auto generate berjalan
Jika off, maka fitur auto generate tidak berjalan
