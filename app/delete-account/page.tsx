import Link from "next/link";
import type { Metadata } from "next";
import { authConfigured, getAuth } from "@/lib/auth/server";
import DeleteAccountForm from "@/components/delete-account-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hapus Akun | UangKita" };

export default async function DeleteAccountPage() {
  const session = authConfigured()
    ? await getAuth()
        .getSession({ query: { disableCookieCache: "true" } })
        .catch(() => null)
    : null;
  return (
    <main className="legal-page">
      <nav aria-label="Navigasi akun">
        <Link href="/login">UangKita</Link>
        <Link href="/privacy">Kebijakan privasi</Link>
      </nav>
      <h1>Hapus akun UangKita</h1>
      <p>
        Kamu dapat menghapus akun melalui halaman ini tanpa memasang aplikasi,
        atau melalui menu Akun di aplikasi Android.
      </p>
      <h2>Sebelum melanjutkan</h2>
      <ol>
        <li>Ekspor catatan pribadi dari menu Akun jika masih diperlukan.</li>
        <li>
          Jika memiliki ruang bersama, beri tahu anggota dan hapus ruang melalui
          menu Bersama dengan konfirmasi nama ruang. Data ruang tersebut akan
          terhapus untuk seluruh anggota.
        </li>
        <li>
          Masuk ke akun yang ingin dihapus. Jika sesi sudah lama, keluar lalu
          masuk kembali. Penghapusan memerlukan sesi login baru dalam 15 menit
          terakhir, untuk akun email maupun Google.
        </li>
        <li>
          Ketik HAPUS AKUN, setujui dampaknya, lalu konfirmasi penghapusan.
        </li>
      </ol>
      <h2>Data yang dihapus</h2>
      <p>
        Identitas login dan sesi, seluruh catatan keuangan pribadi, anggaran,
        kategori, tagihan, target tabungan, undangan email, keanggotaan, serta
        transaksi dan aktivitas buatanmu di ruang bersama dihapus dari database
        aktif. Saldo ruang bersama dapat berubah. Data anggota lain tetap
        tersedia. Penghapusan tidak dapat dibatalkan.
      </p>
      <p>
        Penghapusan database aktif dilakukan saat permintaan terverifikasi
        berhasil. Retensi cadangan pemulihan dan log mengikuti konfigurasi
        penyedia; detailnya dijelaskan dalam{" "}
        <Link href="/privacy">kebijakan privasi</Link>. File ekspor yang telah
        disimpan atau dibagikan berada dalam kendali pemilik salinan.
      </p>
      <DeleteAccountForm email={session?.data?.user.email ?? null} />
      <h2>Kesulitan masuk atau menghapus akun?</h2>
      <p>
        Kirim permintaan penghapusan ke{" "}
        <a href="mailto:contact@aksenraras.my.id?subject=Permintaan%20hapus%20akun%20UangKita">
          contact@aksenraras.my.id
        </a>{" "}
        dari email akunmu. Sertakan email terdaftar dan permintaan penghapusan
        akun UangKita. Kami akan memverifikasi kepemilikan sebelum memproses.
        Jangan kirim password atau kode verifikasi melalui email.
      </p>
    </main>
  );
}
