import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kebijakan Privasi | UangKita" };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav aria-label="Navigasi kebijakan">
        <Link href="/login">UangKita</Link>
        <Link href="/delete-account">Hapus akun</Link>
      </nav>
      <h1>Kebijakan Privasi UangKita</h1>
      <p>
        Terakhir diperbarui: 7 Oktober 2026. Kebijakan ini berlaku untuk
        aplikasi Android dan situs web UangKita.
      </p>
      <h2>Pengelola dan kontak</h2>
      <p>
        UangKita membantu mencatat dan merencanakan keuangan pribadi serta ruang
        keuangan bersama. Untuk pertanyaan, koreksi data, atau permintaan
        penghapusan, hubungi{" "}
        <a href="mailto:contact@aksenraras.my.id">contact@aksenraras.my.id</a>.
      </p>
      <h2>Data yang diproses</h2>
      <ul>
        <li>
          Identitas akun: nama, email, status verifikasi, dan informasi
          autentikasi. Jika masuk dengan Google, layanan login menerima
          identitas dasar yang kamu izinkan.
        </li>
        <li>
          Catatan keuangan yang kamu masukkan: transaksi, nominal, kategori,
          catatan, anggaran, pendapatan, tagihan, cicilan, dan target tabungan.
        </li>
        <li>
          Data ruang bersama: nama ruang, keanggotaan, undangan email,
          transaksi, anggaran, dan aktivitas anggota.
        </li>
        <li>
          Data teknis untuk keamanan dan operasional: sesi login, alamat IP,
          informasi browser/perangkat, serta log permintaan. Situs web
          menggunakan Vercel Analytics dan Speed Insights untuk statistik
          penggunaan dan performa.
        </li>
      </ul>
      <p>
        UangKita tidak menghubungkan rekening bank atau membaca SMS, kontak,
        maupun lokasi perangkat. File cadangan diakses hanya ketika kamu memilih
        impor atau ekspor melalui pemilih file dan fitur berbagi perangkat.
      </p>
      <h2>Tujuan dan akses data</h2>
      <p>
        Data dipakai untuk autentikasi, menyimpan catatan, menghitung ringkasan
        dan anggaran, menyinkronkan web dengan aplikasi, menjalankan ruang
        bersama, serta menjaga keamanan dan performa layanan. Data tidak dijual
        dan tidak digunakan untuk iklan.
      </p>
      <p>
        Catatan pribadi hanya tersedia pada akunmu. Anggota ruang bersama dapat
        melihat data yang dimasukkan ke ruang tersebut. Pemilik ruang dapat
        mengelola anggota, undangan, anggaran, dan transaksi sesuai izin
        aplikasi. Jangan masukkan informasi sensitif yang tidak ingin dibagikan
        ke dalam catatan ruang bersama.
      </p>
      <h2>Penyedia layanan dan penyimpanan</h2>
      <p>
        Neon menyediakan database dan autentikasi; Vercel menyediakan layanan
        web/API, statistik web, dan pemantauan performa; Expo digunakan untuk
        membangun dan mendistribusikan aplikasi. Google memproses autentikasi
        jika kamu memilih masuk dengan Google. Penyedia memproses data sesuai
        layanan dan kebijakan masing-masing, dan lokasi pemrosesan dapat berada
        di luar Indonesia.
      </p>
      <p>
        Koneksi ke layanan produksi menggunakan HTTPS. Aplikasi menyimpan sesi
        login pada penyimpanan aman perangkat; web memakai cookie sesi.
        Preferensi tampilan disimpan secara lokal. File ekspor yang kamu simpan
        atau bagikan berada dalam kendalimu.
      </p>
      <h2>Penyimpanan dan penghapusan</h2>
      <p>
        Data akun aktif disimpan sampai kamu menghapusnya. Kamu dapat menghapus
        transaksi atau mengosongkan catatan pribadi tanpa menghapus akun. Ekspor
        cadangan terlebih dahulu jika ingin menyimpan salinan.
      </p>
      <p>
        <Link href="/delete-account">Penghapusan akun</Link> menghapus identitas
        login, sesi, data keuangan pribadi, undangan untuk emailmu, keanggotaan,
        serta transaksi dan aktivitas yang kamu buat di ruang bersama dari
        database aktif. Perubahan ini dapat memengaruhi saldo ruang bersama.
        Catatan anggota lain dan ruang milik anggota lain tetap tersedia.
      </p>
      <p>
        Jika masih menjadi pemilik ruang, hapus ruang terlebih dahulu melalui
        menu Bersama dengan konfirmasi nama ruang. Penghapusan ruang merupakan
        tindakan terpisah yang menghapus data ruang untuk seluruh anggota. Beri
        tahu anggota dan simpan catatan yang masih diperlukan sebelum
        melanjutkan.
      </p>
      <p>
        Setelah verifikasi berhasil, penghapusan dari database aktif diproses
        saat permintaan diselesaikan. Cadangan pemulihan database dan log
        operasional dapat tetap ada mengikuti masa retensi yang dikonfigurasi
        pada penyedia layanan; salinan tersebut tidak digunakan sebagai akun
        aktif. Hubungi dukungan untuk informasi retensi yang berlaku atau
        permintaan terkait salinan pemulihan. File ekspor yang sudah disimpan
        oleh kamu atau anggota lain tidak dapat ditarik kembali oleh UangKita.
      </p>
      <h2>Hak dan bantuan</h2>
      <p>
        Kamu dapat mengakses, memperbaiki, mengekspor, dan menghapus catatan
        melalui aplikasi atau web. Permintaan terkait identitas akun, privasi,
        atau kesulitan menghapus akun dapat dikirim ke email dukungan. Kami akan
        meminta verifikasi kepemilikan akun sebelum memproses permintaan yang
        berkaitan dengan data pribadi.
      </p>
      <h2>Perubahan kebijakan</h2>
      <p>
        Kebijakan ini dapat diperbarui ketika layanan atau pemrosesan data
        berubah. Tanggal pembaruan ditampilkan pada halaman ini.
      </p>
      <nav aria-label="Tautan dukungan">
        <Link href="/delete-account">Penghapusan akun</Link>
        <a href="mailto:contact@aksenraras.my.id">Hubungi dukungan</a>
      </nav>
    </main>
  );
}
