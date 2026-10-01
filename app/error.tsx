"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>Koneksi sedang terganggu</h1>
      <p>Data belum dapat ditampilkan. Coba muat kembali.</p>
      <button className="primary" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
