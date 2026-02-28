# Klarifikasi Sprint 3 - Pembuatan Tagihan

Silakan isi `Jawaban:` di bawah setiap pertanyaan.

## 1. Ruang Lingkup Pembuatan Tagihan
1. Apakah dalam **1 kali pembuatan tagihan** admin boleh menggabungkan beberapa target sekaligus (mis. kelas + spesifik santri)?
Jawaban: hanya salah satu target

2. Jika boleh gabung target, saat ada bentrok nominal pada santri yang sama, prioritasnya bagaimana?
Jawaban: Tidak boleh gabung target

3. Fitur ini berlaku untuk tagihan apa saja?
- Bulanan
- Insidental
- Keduanya
Jawaban: Keduanya 

## 2. Aturan Target dan Nominal
4. Target `Semua Santri`: apakah nominal selalu satu nilai untuk semua?
Jawaban: Ya

5. Target `Gender`: apakah cukup 2 nominal (`L` dan `P`), dan boleh salah satu kosong?
Jawaban: Harus ada isinya minimal 1

6. Target `Kelas`: apakah admin mengisi nominal per kelas satu per satu?
Jawaban: Admin wajib isi semua

7. Target `Spesifik Santri`: inputnya bagaimana?
- Pilih satu-satu
- Multi-select
- Import file
- Kombinasi
Jawaban: multi select, per santri disini bisa beda nominal tagihanya

8. Untuk santri nonaktif/lulus/keluar, apakah otomatis dikecualikan saat generate tagihan?
Jawaban: Ya

## 3. Periode, Duplikasi, dan Publish
9. Tagihan butuh periode apa?
- Bulan-Tahun
- Tanggal terbit + jatuh tempo
- Tergantung tipe tagihan
Jawaban: Untuk tagihan bulanan pakai  Bulan dan tahun
Untuk tagihan insidential pakai  Tanggal terbit + jatuh tempo

10. Jika sudah ada tagihan dengan `santri + komponen + periode` yang sama, sistem harus:
- Tolak
- Skip
- Timpa draft
- Opsi pilihan admin
Jawaban: Munculkan error

11. Nominal `0` boleh dibuat sebagai tagihan?
Jawaban: Tidak boleh

12. Setelah status `Terbit`, apakah nominal masih boleh diubah?
- Tidak boleh
- Boleh jika belum ada pembayaran
- Boleh selalu
- Harus batal + buat ulang
Jawaban: Untuk tagihan yang sudah tergenerate tidak boleh diedit, 
Untuk tagihan yang belum tergenerate boleh 
Misal tagihan syahriyyah sekarang 10K
dan di bulan Maret naik jadi 20K
Sekrang tanggal 27 Feb
maka tagihan yang sudah tergenreate ( jan dan feb ) Tetap 10K
tetapi jika admin edit jadi 20 ( dalam tagihan master )
maka tagihan di bulan berikutnya ( maret dst ) menjadi 20k
sedangkan tagihan jan dan feb tetap 10K 



## 4. UX Admin dan Kontrol
13. Alur UI yang diinginkan:
- Wizard bertahap
- Form satu halaman
Jawaban: Form 1 halaman

14. Perlu halaman `Preview` sebelum publish (jumlah santri, total nominal, daftar yang terkena)?
Jawaban: Ya

15. Saat publish, perlu konfirmasi final dua langkah (mis. checkbox + tombol publish)?
Jawaban: Ya

16. Perlu fitur `Simpan sebagai Template` untuk pembuatan tagihan berikutnya?
Jawaban: Tidak

## 5. Audit dan Operasional
17. Data audit minimal apa yang wajib disimpan saat pembuatan/publish tagihan?
Jawaban: buat, edit, publish  

18. Perlu alasan wajib saat edit/hapus rule atau batal publish?
Jawaban: Ya ( non mandatory )

19. Jika terjadi error sebagian saat generate, kebijakan yang diinginkan:
- All-or-nothing (rollback total)
- Partial success + laporan gagal
Jawaban: - All-or-nothing (rollback total)


20. Exit criteria Sprint 3 versi Anda (tolong tulis kondisi sukses yang paling penting):
Jawaban: kondisi diatas terpenuhi ( pertanyaan 1 sampai 19 )
