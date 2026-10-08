# UangKita Mobile

Aplikasi React Native dengan Expo SDK 57 dan Expo Router, menggunakan API Next.js UangKita yang sama dengan web. UI menggunakan komponen native, bukan WebView.

## Menjalankan

Dari root repository, install dependensi web sekali (`npm install`), lalu:

```powershell
cd mobile/UangKita
npm install
Copy-Item .env.example .env.local
# API sudah mengarah ke https://uangkita.aksenraras.my.id.
npm start
```

Buka di Expo Go yang mendukung SDK 57 atau development build yang sesuai. Android emulator dapat dibuka dengan `npm run android`. Aplikasi memerlukan login dan koneksi ke API. `npm run web` menyediakan pratinjau browser; login email pada browser memerlukan origin yang diizinkan server, sedangkan login Google ditujukan untuk Android/iOS.

## Fitur

- Beranda: saldo, pemasukan, pengeluaran dibayar, perkiraan tagihan, dan pintasan fitur.
- Aktivitas: pencarian, filter, tambah/edit/hapus transaksi, status aktif, dan riwayat transfer ruang yang hanya dapat dibaca.
- Kredit: jatuh tempo dan pembayaran bertahap pada tanggal aktual, dengan validasi total pembayaran.
- Anggaran: kategori, rincian transaksi terbesar, target tabungan dalam total alokasi, sisa setelah rencana, serta sisa uang aktual tanpa memotong setoran dua kali.
- Tabungan: setoran, penarikan, riwayat, dan rencana target bulanan/kumulatif.
- Tagihan: template rutin, pencatatan bulanan, kredit belum lunas, dan perkiraan sisa uang.
- Analitik: arus kas enam bulan, pengeluaran kategori, rasio dan kesehatan kredit.
- Akun: login/daftar email, verifikasi OTP, tema, sembunyikan nominal, kategori, impor/ekspor cadangan JSON, reset, kebijakan privasi, dukungan, dan hapus akun permanen dengan konfirmasi.
- Ruang bersama: buat ruang pasangan/keluarga, kontribusi, pengeluaran, kredit, anggaran, undangan, anggota, riwayat perubahan, dan penghapusan ruang oleh pemilik.

Login Google memakai provider Neon yang sama dengan web, membuka browser sistem, lalu kembali ke aplikasi melalui `uangkita://login`. Backend Next.js perlu di-deploy dengan route `/api/mobile-auth/callback` yang baru sebelum dicoba pada API produksi. Gunakan APK atau development build; Expo Go tidak mendaftarkan scheme UangKita. Tidak perlu membuat password baru untuk akun Google atau memasukkan client secret Google ke aplikasi.

Challenge OAuth hanya disimpan di memori selama login. Deep link membawa verifier yang masih harus ditukar dengan challenge tersebut melalui `/api/auth/get-session`, bukan token sesi. Callback diperiksa terhadap state acak setiap percobaan, kemudian sesi tersimpan di SecureStore. Membatalkan browser mengembalikan pengguna ke login tanpa mengubah akun.

## Navigasi Back

Semua perpindahan fitur menggunakan `router.push()` dalam Stack Expo Router, termasuk navigasi bawah. Tombol Back Android, gesture iOS, dan panah header kembali ke layar yang benar-benar dikunjungi sebelumnya.

Contoh: Beranda → Anggaran → Tabungan → Back kembali ke Anggaran. Form berhasil disimpan → kembali ke fitur pembukanya. Perpindahan antarbagian ruang bersama juga masuk riwayat. Layar sebelumnya mempertahankan pencarian, filter, dan posisi scroll; bulan dipakai bersama antarfitur.

## API dan perhitungan

`EXPO_PUBLIC_API_URL` sudah diatur ke `https://uangkita.aksenraras.my.id` pada konfigurasi lokal, contoh environment, dan kedua profil build EAS. URL ini adalah URL publik server, bukan rahasia. Jangan menaruh `DATABASE_URL`, secret Neon, atau kredensial server pada variabel `EXPO_PUBLIC_*`.

API client menggunakan `/api/auth/*`, `/api/finance`, `/api/spaces`, `/api/spaces/:id/finance`, dan `/api/account/delete`. Cookie token sesi Neon disimpan di Expo SecureStore, dikaitkan dengan origin server, dan disertakan hanya pada permintaan API ke server tersebut. Header Origin memenuhi pemeriksaan API yang sudah ada. Pemeriksaan sesi, kepemilikan data, validasi, dan izin ruang pada backend tetap berlaku.

Privasi tersedia di `/privacy` dan panduan penghapusan di `/delete-account`, keduanya dapat dibuka tanpa login. Penghapusan permanen memerlukan konfirmasi `HAPUS AKUN`, persetujuan dampak pada transaksi ruang bersama, dan sesi login baru dalam 15 menit terakhir, untuk akun email maupun Google. Pemilik harus menghapus ruang terlebih dahulu melalui konfirmasi nama ruang. Pasang migrasi `007_account_deletion.sql` pada database yang sama dengan Neon Auth; API menolak penghapusan jika cleanup atomik belum terpasang. Sesi diverifikasi langsung ke layanan autentikasi lalu diperiksa kembali di database. Akun, sesi, kredensial, dan data terkait dihapus dalam satu transaksi melalui cascade serta trigger; sesi lokal mobile dibersihkan setelah API berhasil.

Perhitungan dan skema validasi dipakai dari `../../lib/` melalui `src/lib/finance.ts`. Metro menyelesaikan dependensi dari `mobile/UangKita/node_modules`, agar React Native tidak tercampur dengan React web. Build Next di root mengecualikan `mobile/` dari TypeScript dan ESLint.

Jatah makan harian dihitung oleh API Next.js `/api/finance` dan dikirim lewat `budgets[].dailyFoodAllowance`; mobile hanya menampilkan hasilnya. Deploy backend terbaru diperlukan agar jatah harian muncul.

Daftar pilihan kategori form berasal dari `availableCategories` pada respons pribadi maupun ruang bersama. Filter aktivitas pribadi memakai `activityCategories`, termasuk kategori transfer ruang. API menyatukan variasi huruf besar/kecil dan spasi tepi dengan nama yang sudah tersimpan. Kontrak endpoint lengkap dicatat di README repository.

## Pemeriksaan

```powershell
npm run typecheck
npm run lint
npm test
npx expo export --platform android
```

Tes UI memakai Playwright milik web. Dari root repository:

```powershell
npx playwright test --config mobile/UangKita/playwright.config.ts
```

Tes UI menjalankan React Native melalui React Native Web dengan API tiruan yang hanya ada di file tes. Tes memeriksa login, pemulihan sesi, riwayat fitur, kembali setelah menyimpan form, validasi, dan target tabungan. Tes ini tidak menggantikan pengujian tombol Back pada perangkat Android fisik atau pengujian login live.

## APK

`eas.json` menyediakan profil `preview` dan `production` untuk APK, serta `store` untuk Android App Bundle. Semuanya memakai URL API UangKita. Setelah masuk ke akun Expo dan menghubungkan proyek EAS, jalankan:

```powershell
npm run build:apk
```

Perintah ini membangun dan menandatangani APK melalui EAS. Bundle Android lokal saja belum merupakan APK. Package Android untuk Play Console: `com.aksenraras.uangkita.app`.

Referensi: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Router Stack](https://docs.expo.dev/router/advanced/stack/), [EAS APK](https://docs.expo.dev/build-reference/apk/).

## Google Play

Ikuti [checklist publikasi dan update](PLAY_STORE_CHECKLIST.md) untuk setup Play Console, service account, EAS Submit, testing, dan rilis. `npm run build:aab` membuat AAB; `npm run build:play` membuat AAB lalu mengunggahnya otomatis ke draft Internal testing setelah kredensial Google dikonfigurasi. Publikasi dan review diselesaikan di Play Console.
