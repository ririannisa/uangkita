"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Heart,
  Check,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import "./login.css";

export default function LoginForm({
  configured,
  oauthError = false,
}: {
  configured: boolean;
  oauthError?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    oauthError ? "Login Google belum selesai. Silakan coba lagi." : "",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    try {
      const result =
        mode === "login"
          ? await authClient.signIn.email({
              email,
              password,
              callbackURL: window.location.origin + "/",
            })
          : await authClient.signUp.email({
              email,
              password,
              name: String(form.get("name")).trim(),
              callbackURL: window.location.origin + "/",
            });
      if (result.error)
        setMessage(
          mode === "login"
            ? "Belum berhasil masuk. Periksa email, password, dan status verifikasi emailmu."
            : result.error.message || "Pendaftaran belum berhasil. Coba lagi.",
        );
      else if (mode === "register" && !result.data?.token) {
        setMessage("Akun dibuat. Periksa email untuk verifikasi, lalu masuk.");
        setMode("login");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setMessage("Tidak dapat terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/",
        errorCallbackURL: window.location.origin + "/login?error=google",
      });
      if (result.error)
        setMessage(
          "Login Google belum berhasil. Silakan coba lagi atau masuk dengan email.",
        );
    } catch {
      setMessage("Tidak dapat terhubung ke Google. Coba lagi nanti.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/login" className="brand">
          dompet<span>ku.</span>
        </Link>
        <div className="login-story-content">
          <span className="login-pill">
            <Sparkles size={14} /> Teman baik dompetmu
          </span>
          <h1>
            Uang rapi.
            <br />
            Hidup lebih <em>happy.</em>
          </h1>
          <p>
            Buat jajan hari ini, nabung buat nanti.
            <br />
            Yuk, kasih ruang buat semua rencanamu.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <span className="doodle-star star-one">✳</span>
            <span className="doodle-star star-two">✦</span>
            <div className="wallet-orbit" />
            <div className="wallet-note">
              <span>buat mimpi besarmu</span>
              <Heart size={21} />
            </div>
            <div className="happy-wallet">
              <div className="wallet-stitch" />
              <Wallet className="wallet-symbol" size={25} />
              <div className="wallet-face">
                <i />
                <i />
                <span />
              </div>
              <span className="wallet-caption">little by little.</span>
              <div className="wallet-clasp">
                <span />
              </div>
            </div>
            <div className="saving-sticker">
              <span>
                <Check size={16} />
              </span>
              <div>
                <b>Nabung? Bisa dong.</b>
                <small>Sedikit juga berarti!</small>
              </div>
            </div>
            <div className="coin-sticker">Rp</div>
            <span className="tiny-spark">✧</span>
          </div>
          <div className="login-feature-chips">
            <span>
              <Check size={13} /> Catat gampang
            </span>
            <span>
              <Check size={13} /> Nabung tenang
            </span>
            <span>
              <Check size={13} /> Jajan terencana
            </span>
          </div>
        </div>
        <p className="login-story-footer">
          Dibikin untuk hidup nyata. Termasuk jajan kopinya{" "}
          <span aria-hidden="true">☕</span>
        </p>
      </section>
      <section className="login-form-area" aria-labelledby="login-heading">
        <div className="login-form-card">
          <span className="hello-sticker" aria-hidden="true">
            {mode === "login" ? "👋" : "🌱"}
          </span>
          <span className="login-kicker">DOMPETMU, CERITAMU</span>
          <h2 id="login-heading">
            {mode === "login" ? "Halo, kamu!" : "Mulai bareng, yuk!"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Senang kamu mampir. Yuk, lanjut merawat dompetmu."
              : "Satu akun untuk semua rencana kecil dan mimpi besarmu."}
          </p>
          {!configured && (
            <div className="notice">
              Login sedang disiapkan. Sementara itu, kamu bisa{" "}
              <Link href="/demo">jelajahi contoh aplikasi</Link>.
            </div>
          )}
          <button
            className="google-button full login-google"
            onClick={google}
            disabled={busy || !configured}
          >
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
              <path
                fill="#4285F4"
                d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
              />
              <path
                fill="#34A853"
                d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.3H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
              />
              <path
                fill="#FBBC05"
                d="M12.6 28a12 12 0 0 1 0-8v-5.2H5.8a20 20 0 0 0 0 18.4L12.6 28Z"
              />
              <path
                fill="#EA4335"
                d="M24 11.7c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.8l6.8 5.2c1.6-4.7 6.1-8.3 11.4-8.3Z"
              />
            </svg>
            Google
            <span className="google-hint" aria-hidden="true">
              lanjut dengan akunmu
            </span>
          </button>
          <div className="login-divider">
            <span>atau pakai email</span>
          </div>
          <form onSubmit={submit} className="login-fields">
            {mode === "register" && (
              <label>
                Nama lengkap
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Nama panggilanmu"
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="nama@email.com"
              />
            </label>
            <label>
              Password
              <div className="login-password">
                <input
                  name="password"
                  required
                  type={visible ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={
                    visible ? "Sembunyikan password" : "Tampilkan password"
                  }
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
            <button className="primary full" disabled={busy || !configured}>
              {busy
                ? "Sebentar, ya…"
                : mode === "login"
                  ? "Masuk ke Dompetku"
                  : "Buat akun"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-switch">
            {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Daftar sekarang" : "Masuk"}
            </button>
          </p>
          <div className="login-trust">
            <ShieldCheck size={15} /> Catatan pribadi, untuk kamu sendiri.
          </div>
          <Link href="/demo" className="login-preview">
            Intip dulu juga boleh <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
