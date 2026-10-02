# UangKita

Aplikasi keuangan pribadi Next.js App Router, React, Neon Postgres, dan managed Neon Auth. Tampilan mengadaptasi pola navigasi pada `design.jpeg` dengan identitas Dompetku. File HTML lama tetap tersedia sebagai referensi.

## Ruang pasangan dan keluarga

- **Kelola Kategori** di Menu utama menyimpan kategori pribadi ke Neon sebelum ada transaksi/anggaran. Kategori awal dan kategori historis tetap tersedia. Kategori pribadi ikut ekspor, impor, dan reset; cadangan lama tanpa kategori tetap didukung.
- Di ruang, buka **Kelola Kategori Ruang**. Hanya pemilik yang dapat menambah kategori; semua anggota dapat memakainya pada transaksi dan anggaran. Kategori ruang terpisah dari pribadi dan ikut terhapus jika ruang dihapus. Versi ini menambah kategori tanpa mengganti nama/menghapus kategori historis.

- Pilih **Ruang Bersama** dengan ikon keluarga di Menu utama untuk membuka daftar ruang, membuat ruang pasangan/keluarga, dan melihat undangan. Data pribadi tetap terpisah dari kas bersama.
- Pemilik mengundang alamat email. Undangan tampil di akun penerima, berlaku 7 hari, dan **tidak dikirim melalui email otomatis**. Penerima harus memiliki email terverifikasi; tersedia alur kode verifikasi Neon Auth.
- Semua anggota dapat melihat kas, mencatat kontribusi/pengeluaran, dan menghapus catatannya sendiri. Pemilik mengelola anggaran, undangan, akses anggota, serta pengeluaran. Kontribusi hanya dapat diubah/dihapus oleh penyetornya.
- Pemilik dapat menghapus ruang dengan mengetik nama ruang persis. Seluruh isi ruang dihapus permanen, termasuk sumber transfer kontribusi: dampaknya pada saldo pribadi seluruh penyetor ikut dibatalkan. Catatan pribadi lainnya tidak berubah.
- Saldo kas membawa saldo periode sebelumnya. Ringkasan kontribusi/pengeluaran dan realisasi anggaran mengikuti bulan pilihan. Detail kategori mengurutkan pengeluaran terbesar beserta pencatatnya.
- Kontribusi (termasuk yang sudah ada) otomatis muncul sebagai transfer di aktivitas pribadi penyetor pada bulan asalnya. Saldo berkurang, tetapi belanja, realisasi anggaran pribadi, dan tabungan pribadi tidak bertambah. Catatan transfer dibaca langsung dari kontribusi Neon, bukan disalin; edit/hapus langsung tercermin tanpa duplikasi. Anggota yang dikeluarkan tetap melihat transfer pribadinya, tetapi tidak bisa membaca ruang.
- Ekspor/impor/reset pribadi tidak mencakup kontribusi maupun transfer turunannya; kelola dari ruang asal. Pembayaran pribadi, reimbursement, pembagian tagihan otomatis, serta tujuan tabungan bersama belum termasuk versi ini.
- Tabel bersama terpisah dari tabel pribadi; pemeriksaan sesi dan keanggotaan dilakukan server-side. Perubahan transaksi/anggaran dicatat dalam riwayat. Data anggota yang dikeluarkan tetap tersimpan, tetapi aksesnya dicabut.
- `npm run db:migrate` menjalankan seluruh file SQL bernomor di `db/` secara idempotent. Migrasi `002_spaces.sql` menambahkan tabel bersama tanpa memindahkan data pribadi.
- `npm test` mencakup perhitungan saldo bersama dan realisasi. `scripts/smoke-spaces.mjs` memakai akun tes yang sudah ada melalui `TEST_EMAIL`/`TEST_PASSWORD`, menguji API dan UI, lalu menghapus hanya ruang sementara buatannya. Jangan memasukkan kredensial ke kode.

## Menjalankan aplikasi

```sh
npm install
npm run dev
```

- `http://localhost:3000/demo`: contoh interaktif dengan data simulasi; tidak menulis ke database. Perubahan hilang saat reload.
- `http://localhost:3000/login`: masuk/daftar dengan email-password atau Google.
- `/`: dashboard pengguna, membutuhkan sesi terverifikasi.

## Konfigurasi Neon dan Vercel

Saat implementasi, integrasi Neon sudah tercatat pada Vercel untuk **Preview dan Production**. Environment **Development** belum memiliki connection string. `vercel env pull` tidak dapat menarik secret Preview/Production: nilai `[SENSITIVE]` hanyalah placeholder, bukan kredensial.

1. Buka Vercel → Storage → Neon → Open in Neon Console. Pilih branch development yang akan digunakan.
2. Salin connection string dan URL Neon Auth branch yang sama ke `.env.local`, mengikuti `.env.example`. Atau aktifkan environment Development pada integrasi lalu jalankan `vercel env pull .env.development.local`. Jangan commit kredensial.
3. Buat secret cookie:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Simpan sebagai `NEON_AUTH_COOKIE_SECRET` di lokal dan environment Vercel yang sesuai. Nilainya harus stabil di seluruh instance pada environment yang sama; jangan ganti setiap deploy.

4. Jalankan schema pada database branch tersebut:

   ```sh
   npm run db:migrate
   ```

   Alternatif: jalankan seluruh isi `db/001_finance.sql` di **Neon SQL Editor**. Migrasi membuat schema `dompetku` dan tabel baru secara idempotent, dalam satu transaksi. Tidak menghapus tabel yang sudah ada. Jalankan pada tiap branch yang belum mewarisi schema tersebut. Build tidak menjalankan migrasi otomatis.

5. Neon Console → Auth: aktifkan email/password. Pengaturan verifikasi email mengikuti konfigurasi managed Neon Auth. Daftarkan `http://localhost:3000` dan domain aplikasi sebagai trusted domains.
6. Aktifkan provider **Google** di Neon Auth. Untuk production gunakan OAuth client milik aplikasi. Kredensial Google disimpan pada pengaturan provider Neon, bukan dikirim ke browser. Gunakan callback yang ditampilkan Neon: `<NEON_AUTH_BASE_URL>/callback/google`. `callbackURL` pada aplikasi adalah `/`; proxy Next.js menyelesaikan pertukaran sesi ketika pengguna kembali.
7. Pastikan Vercel mempunyai `DATABASE_URL`, `NEON_AUTH_BASE_URL`, dan `NEON_AUTH_COOKIE_SECRET`, kemudian deploy/redeploy setelah schema dan provider siap.

Referensi: [Neon Next.js SDK](https://github.com/neondatabase/neon-js/blob/main/packages/auth/NEXT-JS.md), [pengaturan provider dan domain Neon](https://neon.com/docs/cli/neon-auth).

## Schema dan akses

| Tabel                    | Isi                                                                              |
| ------------------------ | -------------------------------------------------------------------------------- |
| `dompetku.monthly_plans` | Pendapatan tetap per pengguna dan bulan                                          |
| `dompetku.budgets`       | Kategori, batas anggaran, pengguna, bulan; nama kategori unik per bulan          |
| `dompetku.entries`       | Pemasukan, pengeluaran, setoran/penarikan, dan pengeluaran tetap                 |
| `neon_auth.*`            | Dikelola otomatis oleh Neon Auth; akun dan sesi tidak dibuat ulang oleh aplikasi |

`user_id` berasal dari sesi Neon yang diverifikasi server, bukan input browser. Query baca/update/delete selalu dibatasi pengguna. Kolom ini disimpan sebagai text untuk mengikuti ID SDK tanpa ketergantungan pada internal schema provider. Aplikasi menggunakan connection string role pemilik tabel di server. RLS diaktifkan tanpa policy publik; akses langsung dari client/Data API tidak diizinkan. Database URL tidak pernah dikirim ke client.

Nominal berupa integer rupiah, maksimal Rp1 triliun per catatan. Tanggal divalidasi server dan default tanggal menggunakan zona Asia/Jakarta. Cadangan divalidasi penuh dan dipulihkan secara atomik. ID baru dibuat saat impor sehingga ID akun lain tidak dapat tertimpa. Password, cookie sesi, dan OAuth ditangani SDK managed Neon Auth.

## Perilaku fitur

- Pengeluaran pribadi (termasuk pengeluaran tetap) dan ruang bersama dapat dicatat dengan pembayaran **Langsung** atau **Kredit**. Kredit wajib memiliki tanggal jatuh tempo pada atau setelah tanggal transaksi; tanggal tampil di aktivitas dan tersimpan dalam cadangan pribadi. Catatan lama dianggap pembayaran langsung. Status kredit **Belum lunas / Lunas** dan tanggal pembayaran dapat diedit. Kredit belum lunas tidak mengurangi saldo; pelunasan mengurangi saldo pada bulan pembayaran aktual, bukan pada bulan jatuh tempo. Pengeluaran dan realisasi anggaran tetap mengikuti tanggal transaksi. Aktivitas menampilkan kredit belum lunas dari bulan sebelumnya dan kredit yang dibayar pada bulan pilihan. Grafik arus kas mengikuti pembayaran aktual. Cadangan pribadi menyimpan tanggal pembayaran. Kredit lama tanpa tanggal pembayaran dianggap belum lunas dan perlu diperbarui sesuai riwayat pembayaran. Cicilan parsial belum dilacak. Jalankan `npm run db:migrate` untuk menerapkan `004_credit.sql` dan `005_credit_payment.sql` sebelum memakai fitur pada database.
- Saldo **bulanan** = pendapatan tetap + pemasukan tambahan − pengeluaran − pengeluaran tetap aktif − setoran + penarikan. Saldo bulan sebelumnya tidak otomatis dibawa ke bulan berikutnya.
- Anggaran/pendapatan berlaku per bulan. Pengeluaran tetap dicatat untuk bulan yang dipilih; belum ada scheduler pencatatan tagihan otomatis. Ini menjaga angka historis saat nilai tagihan berubah.
- Realisasi kategori mencakup pengeluaran dan pengeluaran tetap aktif, mencocokkan nama kategori tanpa membedakan huruf besar/kecil atau spasi tepi. Mengubah nama kategori anggaran mengubah pencocokan; transaksi lama tidak diubah otomatis.
- Rincian anggaran diurutkan dari transaksi terbesar; peringatan mulai 80%, status berlebih saat nominal melampaui batas.
- Saldo tabungan dihitung dari seluruh riwayat, bukan angka saldo terpisah. Form menarik tabungan membatasi nominal sesuai saldo yang sedang terlihat; penghapusan/edit riwayat dapat mengubah saldo historis.
- Grafik enam bulan, pencarian/filter transaksi, edit/hapus, pengeluaran tetap aktif/nonaktif, backup JSON, dan reset data tersedia.
- Analitik kredit menampilkan grafik kredit baru dan pelunasan enam bulan, rasio kredit baru serta sisa belum lunas terhadap pemasukan bulan pilihan (pendapatan tetap + pemasukan tambahan), dan rincian kategori. Kredit baru mengikuti tanggal transaksi; pelunasan mengikuti tanggal pembayaran; sisa belum lunas dihitung sampai akhir bulan pilihan dan mencakup kredit bulan sebelumnya. Pemasukan nol ditampilkan tanpa persentase.
- Impor menerima format backup aplikasi Next.js versi 1. Cadangan/localStorage HTML lama belum diimpor otomatis; data HTML tetap utuh.
- Login belum mencakup antarmuka reset password. Kebijakan verifikasi email dan Google diatur pada Neon Auth.

## Pemeriksaan

```sh
npm test
npm run test:e2e
npm run lint
npm run build
```

Tes browser memakai Chrome yang terpasang (`npx playwright install chrome` jika belum ada) pada viewport mobile dan desktop. Tes menggunakan `/demo` sehingga tidak membuat akun atau transaksi nyata. Screenshot tersedia di `artifacts/` (diabaikan Git). Tes unit memeriksa saldo, realisasi, validasi nominal/tanggal, dan cadangan duplikat.

Koneksi database, proses login riil, dan Google OAuth perlu diuji setelah environment asli serta provider tersedia. Jangan menganggap tes demo sebagai verifikasi integrasi Neon live.
