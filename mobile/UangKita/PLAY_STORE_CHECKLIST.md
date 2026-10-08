# Checklist publikasi UangKita ke Google Play

Diperiksa: 7 Oktober 2026. Label menu dan persyaratan bisa berubah; cek sumber resmi ketika merilis.

## 1. Identitas proyek dan persiapan awal

| Item | Nilai saat ini |
| --- | --- |
| Folder aplikasi | `mobile/UangKita` |
| Akun/proyek Expo | `@valdif11/uangkita` |
| EAS project ID | `e985179b-b1a9-4a73-b56d-ad698b99726f` |
| Package Android | `com.aksenraras.uangkita.app` |
| API production | `https://uangkita.aksenraras.my.id` |
| Versi yang terlihat pengguna | `expo.version` di `app.json`, saat ini `1.0.0` |
| Nomor build | `android.versionCode`, dikelola remote oleh EAS |

- [x] Daftar [Google Play Console](https://play.google.com/console/signup); pilih Personal/Organization sesuai identitas pengelola.
- [x] Bayar biaya pendaftaran US$25 sekali bayar dan selesaikan verifikasi identitas/kontak.
- [x] Untuk akun personal baru, selesaikan verifikasi perangkat Android bila diminta.
- [x] Tetapkan package Android sebelum upload pertama; identitas ini permanen di Play Store.
- [x] Email dukungan publik: `contact@aksenraras.my.id` (pastikan kotak masuk aktif).

Sumber: [pendaftaran developer](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en), [identitas aplikasi](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).

## 2. Kesiapan UangKita sebelum review

- [x] Ikon UangKita dan splash screen sudah terpasang.
- [x] Profil APK dan profil AAB/submit tersedia di repository.
- [x] Persiapan Acara tersedia untuk pribadi dan Ruang Bersama di web/mobile: template lamaran/wedding mulai belum dicentang, item bisa ditambah/diedit/dihapus, progres dan total estimasi dihitung API, serta biaya persiapan tidak otomatis menjadi transaksi. Rencana pribadi ikut terhapus saat akun dihapus; rencana ruang ikut terhapus saat ruang dihapus.
- [x] Implementasi halaman kebijakan privasi publik `/privacy` dan tautan pada login serta menu Akun web/mobile.
- [x] Implementasi hapus akun dari menu Akun mobile dan halaman publik `/delete-account` tanpa perlu memasang aplikasi.
- [x] API Next.js `POST /api/account/delete` dengan autentikasi, pemeriksaan origin, konfirmasi `HAPUS AKUN`, dan persetujuan dampak pada data bersama.
- [x] Migrasi `007_account_deletion.sql`: cleanup atomik saat identitas Neon Auth dihapus; data pribadi, transaksi/aktivitas buatan pengguna, keanggotaan, dan undangan email ikut dihapus. Data anggota lain tetap ada.
- [x] Web/API terbaru sudah di-push; `/privacy` dan `/delete-account` di domain production terverifikasi HTTP 200 tanpa login pada 7 Oktober 2026.
- [x] Uji database rollback lulus: konfirmasi kepemilikan ruang, cleanup identitas/sesi/kredensial/data aplikasi, penolakan sesi lama/kedaluwarsa/impersonasi/sesi akun lain, dan perlindungan data anggota lain.
- [x] Uji dev lulus: 25 tes logika web/API, 28 tes browser Next.js (desktop/ponsel), 6 tes logika mobile, serta 5 tes antarmuka React Native melalui browser. Tes mobile memakai mock API; pembatalan tidak mengirim permintaan hapus akun, kegagalan mempertahankan login/data, dan keberhasilan mengembalikan pengguna ke login. Persiapan acara diuji untuk tambah/edit/hapus/centang, konflik perubahan, pemisahan pribadi/ruang, dan saldo yang tetap sama. Hak akses, konflik, cascade rencana, serta cleanup akun diuji terpisah dengan query API yang sama dan seluruh data sintetis di-rollback.
- [x] Pastikan database deployment sama dengan branch Neon Auth dan migrasi cleanup sudah terpasang. API memakai satu transaksi database untuk menghapus identitas, sesi, kredensial, dan data aplikasi.
- [x] Uji end-to-end dengan akun khusus pengujian: sesi baru maksimal 15 menit, konfirmasi, sesi kedaluwarsa, kepemilikan ruang, dan kehilangan akses setelah akun dihapus.
- [x] Tetapkan dan verifikasi masa retensi backup database serta log Neon/Vercel; isi kebijakan privasi dengan durasi aktual sebelum review.
- [x] Build AAB terbaru agar menu privasi dan hapus akun masuk dalam binary yang dikirim ke reviewer.
- [x] Siapkan akun khusus reviewer dengan login email/password yang sudah terverifikasi serta data contoh.
- [x] Pastikan reviewer dapat memakai semua fitur tanpa bergantung pada OTP atau persetujuan pribadi pemilik aplikasi.
- [x] Uji login email dan Google pada perangkat Android nyata, termasuk kembali dari browser.
- [x] Uji kategori, transaksi, anggaran, jatah harian, pembayaran kredit, tabungan, ruang bersama, backup/impor, dan reset.
- [x] Pastikan backend production tersedia selama testing dan review.

**Hapus data pribadi** tetap mereset catatan/rencana tanpa menghapus identitas login. Gunakan **Hapus akun permanen** untuk menghapus akun beserta data terkait. Pemilik ruang harus menghapus ruang melalui konfirmasi nama ruang terlebih dahulu; ini merupakan tindakan terpisah yang berdampak pada seluruh anggota. Penghapusan akun anggota menghapus transaksi buatannya sehingga saldo ruang dapat berubah.

URL untuk Play Console setelah deployment terverifikasi:

| Kegunaan | URL |
| --- | --- |
| Privacy policy | `https://uangkita.aksenraras.my.id/privacy` |
| Account deletion | `https://uangkita.aksenraras.my.id/delete-account` |
| Dukungan | `contact@aksenraras.my.id` |

Jalankan `npm.cmd run db:migrate` dari root pada database yang sama dengan Neon Auth deployment. API menolak penghapusan jika trigger cleanup belum terpasang. `npm.cmd run test:account:db` menguji cleanup dan perlindungan ruang menggunakan data sintetis yang seluruhnya di-rollback; tidak menghapus akun pengguna nyata.

Kebijakan privasi menjelaskan pengelola/kontak, jenis data, tujuan pemrosesan, penyedia layanan, retensi, dan proses penghapusan. Permintaan hapus akun dapat dimulai melalui halaman web yang ditautkan dari aplikasi; penghapusan tetap perlu benar-benar diproses.

Sumber: [persiapan review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en-GB), [hapus akun](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## 3. Buat aplikasi dan listing di Play Console

- [ ] Klik **Create app**: nama `UangKita`, bahasa Indonesia, jenis App, gratis/berbayar sesuai rencana.
- [ ] Lengkapi deklarasi dan Play App Signing.
- [ ] Pilih kategori Keuangan/Finance dan negara distribusi.
- [ ] Isi nama (maksimal 30 karakter), deskripsi singkat (80), dan deskripsi lengkap (4.000).
- [ ] Siapkan ikon listing 512 × 512, feature graphic 1024 × 500, dan minimal dua screenshot ponsel.
- [ ] Tambahkan screenshot beranda, pencatatan, anggaran, tabungan, dan ruang bersama dengan data contoh yang aman.
- [ ] Lengkapi **App content**: privacy policy, app access, ads, content rating, target audience, Data safety, financial features, dan deklarasi lain yang diminta Console.
- [ ] Pada App access, masukkan akun reviewer beserta petunjuk login.
- [ ] Tinjau nama/email, ID akun, riwayat transaksi, pendapatan/utang, pemrosesan server, layanan pihak ketiga, dan penghapusan untuk Data safety.
- [ ] Jelaskan fungsi pencatatan keuangan dan kredit sesuai implementasi aktual ketika mengisi financial features.

### Deskripsi singkat — siap disalin

```text
Catat keuangan, atur anggaran, dan kelola tabungan pribadi atau bersama.
```

### Deskripsi lengkap — siap disalin

```text
UangKita membantu kamu mencatat keuangan sehari-hari, merencanakan anggaran, dan memantau tabungan dalam satu aplikasi. Kelola catatan pribadi atau buat ruang bersama untuk pasangan dan keluarga.

CATAT PEMASUKAN DAN PENGELUARAN
Catat penghasilan, pengeluaran, serta setoran dan penarikan tabungan. Gunakan kategori yang tersedia atau tambahkan kategori sendiri. Cari transaksi dan gunakan filter untuk menemukan catatan yang kamu butuhkan.

RENCANAKAN ANGGARAN BULANAN
Atur pendapatan dan anggaran per kategori, lalu bandingkan rencana dengan pengeluaran yang sudah tercatat. Lihat sisa anggaran dan transaksi terbesar untuk membantu menentukan prioritas belanja.

PANTAU JATAH MAKAN PER HARI
Lihat perkiraan jatah makan harian berdasarkan sisa anggaran makan, sisa uang yang tercatat, dan jumlah hari sampai akhir bulan. Saat uang yang tersedia lebih terbatas, perhitungan menyesuaikan dengan sisa uang tersebut.

KELOLA TABUNGAN DAN TARGET
Catat setoran dan penarikan, lihat riwayat tabungan, serta susun target dan rencana menabung. Pantau perkembangan tabunganmu dari waktu ke waktu.

PANTAU TAGIHAN DAN PEMBAYARAN KREDIT
Buat catatan tagihan rutin, catat pembelian dengan pembayaran kredit, dan pantau jatuh temponya. Catat pembayaran bertahap agar sisa kewajiban dan arus kas mengikuti pembayaran yang sudah dilakukan.

LIHAT RINGKASAN KEUANGAN
Pantau saldo, pemasukan, pengeluaran, dan perkiraan tagihan dari beranda. Gunakan grafik arus kas dan pengeluaran per kategori untuk memahami kebiasaan keuanganmu.

ATUR KEUANGAN BERSAMA
Buat ruang untuk pasangan atau keluarga, undang anggota, lalu catat kontribusi dan pengeluaran bersama. Kelola anggaran ruang dan lihat riwayat aktivitas anggota, sementara catatan pribadi tetap terpisah dari ruang bersama.

SESUAIKAN TAMPILAN DAN SIMPAN CADANGAN
Pilih tema sesuai selera, sembunyikan nominal saat diperlukan, serta ekspor atau impor cadangan catatan pribadi. Catatan pada akun yang sama dapat diakses melalui aplikasi dan web UangKita.

UangKita menggunakan pencatatan yang kamu masukkan. Kamu perlu akun dan koneksi internet untuk mengakses serta menyimpan data. Kebijakan privasi dan fitur hapus akun tersedia melalui menu Akun.

Mulai dari catatan kecil hari ini, bangun kebiasaan keuangan yang lebih terarah bersama UangKita.

Dukungan: contact@aksenraras.my.id
```

Teks ini menggambarkan fitur yang sudah tersedia. Salin isi blok teks saja ke kolom deskripsi di Play Console. Batas deskripsi singkat 80 karakter dan deskripsi lengkap 4.000 karakter.

Data UangKita dikirim ke server, sehingga jawaban Data safety harus menggambarkan alur tersebut. Tentukan jawaban "dibagikan" berdasarkan definisi Google dan pemrosesan nyata; penggunaan penyedia layanan tidak otomatis berarti semua data harus dinyatakan dibagikan.

Sumber: [listing](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), [aset visual](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [financial features](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en).

## 4. Konfigurasi Expo yang sudah diterapkan

Jalankan perintah dari folder aplikasi. Pada Windows gunakan `npm.cmd`/`npx.cmd` bila PowerShell memblokir script `npm.ps1`.

```powershell
cd mobile/UangKita
npx.cmd eas-cli@latest whoami
# Jika belum login:
npx.cmd eas-cli@latest login
```

`eas.json` sekarang memiliki `cli.appVersionSource: "remote"` dan profil berikut:

| Profil | Hasil/perilaku |
| --- | --- |
| `build.preview` | APK internal untuk instalasi langsung |
| `build.production` | APK dengan API production, sesuai alur yang sudah digunakan |
| `build.store` | AAB, environment production, mewarisi URL API, menaikkan versionCode otomatis |
| `submit.store` | Upload ke track `internal`, status `draft`, perubahan menunggu pengiriman review dari Play Console |

Konfigurasi penting untuk Play Store:

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "store": {
      "extends": "production",
      "environment": "production",
      "distribution": "store",
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "store": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft",
        "changesNotSentForReview": true
      }
    }
  }
}
```

Cuplikan di atas menunjukkan bagian terkait Play Store; file sebenarnya juga memiliki profil APK/development. Tidak perlu mengganti seluruh file dengan cuplikan ini.

- [ ] Jika aplikasi sudah pernah diupload ke Play, cocokkan nomor remote dengan versionCode tertinggi yang pernah dipakai sebelum build berikutnya:

```powershell
npx.cmd eas-cli@latest build:version:set --platform android
# Masukkan versionCode tertinggi yang sudah digunakan; build store berikutnya menaikkannya.
```

- [ ] Tetap gunakan keystore/upload key proyek yang sama; kelola cadangannya secara aman melalui EAS Credentials.
- [x] Upload key EAS untuk `com.aksenraras.uangkita.app` sudah dicocokkan dengan sertifikat yang diminta Play Console pada 8 Oktober 2026: SHA1 `0F:B5:5E:73:3B:81:3D:34:97:0B:6C:5A:A4:88:F8:22:D7:4F:04:3A`. Kunci yang sama digunakan kembali dari konfigurasi Android sebelumnya. Untuk update berikutnya, gunakan kunci ini; cocokkan dengan **Upload key certificate**, bukan **App signing key certificate**.
- [x] AAB siap upload yang diperbaiki tersedia lokal pada `artifacts/uangkita-play-upload.aab` dari root repository (versi `1.0.0`, versionCode `2`). Build cloud ulang dihentikan EAS karena kuota gratis habis; AAB dari build `16e9beef-ec77-48bf-a536-2dcf7ec7ec29` ditandatangani ulang memakai kunci yang cocok. Manifest package dan SHA1 sertifikat di file hasil diperiksa langsung, `jarsigner -verify` lulus, dan 1.186 berkas aplikasi tetap identik. Artefak lokal tidak masuk Git. Tautan AAB EAS build tersebut tetap memakai sertifikat lama yang ditolak; gunakan file lokal yang sudah diperbaiki ini.
- [ ] Ingat bahwa `EXPO_PUBLIC_API_URL` tertanam saat build; jangan taruh password, database URL, atau secret di variabel `EXPO_PUBLIC_*`.

`autoIncrement` mengelola nomor build, bukan `expo.version` yang dibaca pengguna. Untuk aplikasi yang belum pernah diupload ke Play, EAS menginisialisasi nomor remote saat build; verifikasi nomor hasilnya di detail build.

Sumber: [konfigurasi EAS](https://docs.expo.dev/eas/json/), [versi remote](https://docs.expo.dev/build-reference/app-versions/).

## 5. Service account Google untuk EAS Submit

Langkah ini memerlukan akses pemilik/admin Play Console dan Google Cloud. Konfigurasi repository tidak membuat akun atau memberi izin Google secara otomatis.

- [ ] Buka [Google Cloud Console](https://console.cloud.google.com/) dan pilih/buat proyek untuk publishing UangKita.
- [ ] Aktifkan **Google Play Android Developer API**.
- [ ] Buka **IAM & Admin → Service Accounts**, buat service account untuk publishing.
- [ ] Pada service account, **Keys → Add key → Create new key → JSON**; simpan file di lokasi aman.
- [ ] Di Play Console, buka **Users and permissions → Invite new users**, masukkan email service account (`...gserviceaccount.com`).
- [ ] Batasi akses aplikasi ke UangKita dan beri izin yang diperlukan: view app information, edit/delete draft apps, release testing tracks/manage testers, manage store presence, serta release production/use Play App Signing jika akun ini akan menangani production. Ikuti daftar izin pada panduan resmi ketika UI berubah.
- [ ] Simpan undangan/izin dan tunggu propagasi jika API belum mengenal aksesnya.
- [ ] Upload key Google ke kredensial proyek EAS:

```powershell
npx.cmd eas-cli@latest credentials --platform android
# Pilih profil store.
# Pilih Google Service Account → Upload a Google Service Account Key.
# Pilih file JSON yang tadi diunduh.
```

- [ ] Alternatif UI: proyek Expo → Credentials → Android → `com.aksenraras.uangkita.app` → Service Credentials → Add a Google Service Account Key.
- [ ] Pastikan key terhubung ke package yang sama dengan app di Play Console.
- [ ] Simpan JSON/keystore di luar repository. Jika memakai folder lokal `credentials/`, folder ini sudah diabaikan Git; jangan paksa menambahkannya ke commit.

Konfigurasi menggunakan key yang disimpan di EAS, sehingga tidak memerlukan `serviceAccountKeyPath` dalam `eas.json` atau upload JSON ke GitHub. `EXPO_TOKEN` hanya diperlukan bila CLI dijalankan di CI eksternal; simpan sebagai secret CI.

Sumber: [pembuatan service account dan izin](https://expo.fyi/creating-google-service-account), [hubungkan key ke EAS](https://docs.expo.dev/submit/android/).

## 6. Pemeriksaan dan build AAB pertama

- [ ] Jalankan pemeriksaan lokal:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo-doctor
```

- [ ] Commit versi/source yang akan dirilis; catat commit di catatan release.
- [ ] Buat AAB tanpa submit dulu jika ingin memeriksa artefak pertama:

```powershell
npm.cmd run build:aab
```

- [ ] Catat build ID, commit, versionCode, URL API, dan tautan AAB dari halaman EAS.
- [ ] Periksa target API bundle di Play Console: saat checklist dibuat aplikasi baru/update memerlukan API 36 atau lebih tinggi.
- [ ] Periksa kompatibilitas library native dengan ukuran halaman 16 KB serta hasil pemeriksaan bundle/pre-launch report.

Sumber: [target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=id), [16 KB](https://developer.android.com/guide/practices/page-sizes).

## 7. Submit otomatis dan rilis pertama

- [ ] Setelah aplikasi Play Console dan service account siap, jalankan satu perintah:

```powershell
npm.cmd run build:play
```

Perintah itu menjalankan build AAB profil `store`, lalu meneruskan **build yang sama** ke EAS Submit profil `store`. Hasilnya draft Internal testing; listing, review, dan publikasi diselesaikan di Play Console. Build/submit tidak otomatis menyelesaikan semua formulir Google atau mengaktifkan akses production.

- [ ] Jika AAB sudah dibuat, submit berdasarkan ID build tertentu:

```powershell
# Ganti BUILD_ID_AAB dengan ID build AAB store, bukan build APK.
npx.cmd eas-cli@latest submit --platform android --profile store --id BUILD_ID_AAB
```

- [ ] Alternatif interaktif: `npm.cmd run submit:play`, lalu pilih build AAB yang benar.
- [ ] Hindari `--latest` tanpa memastikan build terbaru adalah AAB; proyek ini juga menghasilkan APK.
- [ ] Periksa status **submission**, bukan hanya status build. Build berhasil dapat diikuti submission yang gagal.
- [ ] Di Play Console → Internal testing, selesaikan draft, release notes, tester, dan pengiriman review/publikasi jika diminta.
- [ ] Jika Google meminta upload awal lewat UI atau ingin jalur manual: Internal testing → Create release → upload AAB hasil EAS → selesaikan Play App Signing dan release. Setelah itu gunakan EAS Submit.

Dokumentasi Expo saat ini mendukung submit pertama otomatis bila prasyarat terpenuhi; upload pertama manual juga tersedia. Sumber: [EAS Submit](https://docs.expo.dev/submit/android/), [upload manual](https://docs.expo.dev/submit/android-manual/), [auto-submit](https://docs.expo.dev/build/automate-submissions/).

## 8. Testing dan akses production

- [ ] Install lewat link Internal testing pada perangkat nyata; uji upgrade, login, backup, dan semua alur utama.
- [ ] Tinjau pre-launch report dan perbaiki masalah yang relevan.
- [ ] Bila akun personal dibuat setelah 13 November 2023: jalankan Closed testing dengan minimum 12 tester yang opted-in terus-menerus selama 14 hari.
- [ ] Buat track Closed testing, tambahkan email/Google Group, bagikan link opt-in, dan pastikan tester bergabung.
- [ ] Kumpulkan feedback serta catat perubahan yang dilakukan. Internal testing tidak menggantikan closed testing yang diwajibkan.
- [ ] Setelah memenuhi syarat, Dashboard → Apply for production; jawab tentang testing, pengguna sasaran, dan kesiapan aplikasi.
- [ ] Tunggu persetujuan akses production. Jumlah/durasi tester memberi hak mengajukan, bukan jaminan persetujuan.

Sumber: [persyaratan testing akun personal](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## 9. Publikasi production

- [ ] Setelah akses production tersedia, promosikan AAB yang sudah diuji dari testing ke production; tidak perlu rebuild hanya untuk berpindah track.
- [ ] Tentukan negara, harga, release notes, dan selesaikan semua deklarasi yang masih terbuka.
- [ ] Kirim perubahan untuk review dari Play Console dan pantau hasilnya.
- [ ] Verifikasi aplikasi bisa ditemukan/install lewat listing setelah publikasi selesai.
- [ ] Pantau crash, ANR, feedback, dan ketersediaan API setelah rilis.

Profil submit otomatis tetap menuju Internal testing. Untuk rilis pertama gunakan promosi di Console agar bundle yang diuji sama dengan bundle yang dirilis. Jangan mengubah `submit.store` ke production hanya untuk melewati testing atau akses yang belum diberikan Google.

## 10. Checklist setiap update

| Jenis perubahan | Alur UangKita saat ini |
| --- | --- |
| Perbaikan API Next.js yang kompatibel dengan aplikasi lama | Deploy backend, uji versi mobile lama dan baru; AAB tidak diperlukan jika kode mobile tidak berubah |
| Tampilan/logika/asset mobile | Build AAB baru, submit ke testing, kemudian promosikan |
| Ikon, splash, permission, native module, Expo SDK, package/config native | Build AAB baru dan uji di perangkat |
| URL `EXPO_PUBLIC_API_URL` | Build ulang karena nilai tertanam saat build |
| Teks/screenshot/deskripsi listing saja | Update lewat Play Console |

- [ ] Tentukan jenis perubahan menggunakan tabel di atas.
- [ ] Naikkan `expo.version` di `app.json`, misalnya `1.0.0` → `1.0.1`; sesuaikan versi `package.json`/lock bila dipakai dalam proses release.
- [ ] Biarkan EAS menaikkan `versionCode`; jangan gunakan kembali nomor yang sudah diupload, termasuk di testing.
- [ ] Untuk perubahan API/database, siapkan migrasi dan backend kompatibel sebelum aplikasi baru dikirim. Pengguna tidak semuanya langsung update.
- [ ] Pertahankan endpoint/field lama selama masih diperlukan aplikasi yang sudah beredar; gunakan penambahan field untuk perubahan kompatibel.
- [ ] Jalankan typecheck, lint, unit test, expo-doctor, dan uji perangkat. Periksa data pengguna lama tidak hilang setelah upgrade.
- [ ] Uji login tersimpan, jatah harian, pembayaran sebagian, undangan ruang, serta impor backup dari versi lama.
- [ ] Catat release notes, commit, build ID, versionCode, dan perubahan backend/migrasi.
- [ ] Jalankan `npm.cmd run build:play`, periksa draft Internal testing, lalu uji build yang benar-benar diupload.
- [ ] Promosikan bundle yang lolos testing ke production dan kirim review.
- [ ] Untuk update setelah rilis pertama, gunakan staged rollout bila tersedia, misalnya mulai sebagian pengguna lalu naikkan setelah pemantauan.
- [ ] Jika update bermasalah, hentikan rollout dan kirim perbaikan dengan versionCode lebih tinggi; binary lama tidak bisa diupload ulang sebagai downgrade.
- [ ] Perbarui privacy policy/Data safety/deklarasi jika praktik data atau fitur berubah.

### EAS Update / OTA

UangKita saat ini belum memasang `expo-updates` atau mengatur `updates.url`, `runtimeVersion`, dan channel EAS Update. Mengunggah OTA sekarang tidak membuat APK/AAB yang sudah terpasang menerima update.

- [ ] Jika kelak memakai OTA, ikuti [setup EAS Update](https://docs.expo.dev/eas-update/getting-started/), pasang modul SDK yang cocok, tentukan channel dan runtime compatibility, lalu build binary baru yang memuat konfigurasi tersebut.
- [ ] Setelah setup, uji perubahan JS/asset pada channel testing dan runtime yang kompatibel sebelum production.
- [ ] Perubahan native tetap memerlukan binary baru dan release Play Store. OTA tidak menghapus kewajiban kebijakan Google.

## 11. Masalah umum ketika submit/update

| Gejala | Pemeriksaan/tindakan |
| --- | --- |
| APK ditolak untuk aplikasi baru | Gunakan build `store` yang menghasilkan AAB |
| versionCode sudah dipakai | Cocokkan versi remote dengan nomor tertinggi di Play; rebuild store dengan nomor lebih tinggi |
| App Bundle ditandatangani dengan kunci yang salah | Cocokkan SHA1 upload key dengan `0F:B5:5E:73:3B:81:3D:34:97:0B:6C:5A:A4:88:F8:22:D7:4F:04:3A` dan pilih keystore EAS yang sesuai sebelum rebuild. Mengganti package tidak mengganti persyaratan sertifikat Play; jangan membuat kunci baru untuk memperbaiki ketidakcocokan ini. |
| 403 / permission denied | Periksa service account, API aktif, akses app yang benar, izin release, dan waktu propagasi |
| Package/application tidak ditemukan | Cocokkan `com.aksenraras.uangkita.app`, aplikasi di Console, dan akses service account; selesaikan upload awal UI jika diminta |
| App masih draft / changes not sent for review | Selesaikan setup, draft dan pengiriman review dari Console; ini sesuai default submit yang dipasang |
| Production belum tersedia | Selesaikan testing serta permohonan akses untuk akun yang diwajibkan |
| Reviewer tidak bisa masuk | Uji kredensial reviewer dari instalasi bersih pada API production; periksa verifikasi email dan akses fitur |
| Target API / native compatibility ditolak | Periksa persyaratan terkini dan semua native dependency; perbaiki melalui Expo config/plugin/SDK, lalu rebuild |
| API berubah tetapi aplikasi lama error | Pulihkan kompatibilitas backend dan siapkan migrasi bertahap |
| Build berhasil tetapi tidak tampil di testing | Periksa status submission, track, draft, review, dan akun Google tester |

Sumber: [submit Android](https://docs.expo.dev/submit/android/), [opsi submit](https://docs.expo.dev/eas/json/), [versi build](https://docs.expo.dev/build-reference/app-versions/).

## Catatan release

Salin tabel ini untuk setiap rilis:

| Item | Isi |
| --- | --- |
| Tanggal / penanggung jawab | |
| Versi pengguna / versionCode | |
| Commit mobile / backend | |
| Build ID / submission ID | |
| Track dan negara | |
| Hasil pengujian / feedback | |
| Migrasi atau perubahan API | |
| Release notes | |
| Status review / publikasi | |
| Hasil pemantauan / tindakan jika ada masalah | |
