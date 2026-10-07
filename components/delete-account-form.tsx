"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function DeleteAccountForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        "Hapus akun dan data UangKita secara permanen? Transaksi buatanmu di ruang bersama juga akan dihapus.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation,
          acknowledgeSharedData: acknowledged,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Akun belum berhasil dihapus.");
      setDeleted(true);
      setMessage("Akun dan data UangKita berhasil dihapus.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (deleted)
    return (
      <section className="legal-card">
        <p role="status">{message}</p>
        <Link href="/login">Kembali ke halaman masuk</Link>
      </section>
    );
  if (!email)
    return (
      <section className="legal-card">
        <p>Masuk untuk memverifikasi kepemilikan akun sebelum menghapusnya.</p>
        <Link className="primary" href="/login?returnTo=/delete-account">
          Masuk untuk menghapus akun
        </Link>
      </section>
    );
  return (
    <form className="legal-card" onSubmit={submit}>
      <p>
        Akun yang akan dihapus: <strong>{email}</strong>
      </p>
      <p>
        Penghapusan memerlukan sesi login baru dalam 15 menit terakhir. Keluar
        lalu masuk kembali jika sesi sudah lama, untuk akun email maupun Google.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await authClient.signOut();
            if (result.error)
              throw new Error("Belum berhasil keluar. Coba lagi.");
            router.replace("/login?returnTo=/delete-account");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Belum berhasil keluar.",
            );
            setBusy(false);
          }
        }}
      >
        Keluar untuk masuk kembali
      </button>
      <label>
        Ketik HAPUS AKUN
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <label className="legal-checkbox">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          disabled={busy}
        />
        Saya memahami bahwa akun dan data pribadi serta transaksi buatan saya di
        ruang bersama akan dihapus permanen.
      </label>
      {message && <p role="alert">{message}</p>}
      <button
        className="danger-button"
        disabled={busy || confirmation !== "HAPUS AKUN" || !acknowledged}
      >
        {busy ? "Memproses…" : "Hapus akun permanen"}
      </button>
    </form>
  );
}
