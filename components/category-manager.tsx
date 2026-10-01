"use client";
import { useState } from "react";
import { categoryNameSchema } from "@/lib/categories";
export default function CategoryManager({
  names,
  onAdd,
  readOnly = false,
}: {
  names: string[];
  onAdd: (name: string) => Promise<boolean>;
  readOnly?: boolean;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="category-manager">
      <p className="muted small">
        Siapkan kategori sebelum mencatat transaksi atau membuat anggaran.
        Catatan lama tetap aman.
      </p>
      {!readOnly && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const parsed = categoryNameSchema.safeParse(name);
            if (!parsed.success) {
              setMessage("Isi nama kategori, maksimal 80 karakter.");
              return;
            }
            if (
              names.some(
                (n) =>
                  n.toLocaleLowerCase("id-ID") ===
                  parsed.data.toLocaleLowerCase("id-ID"),
              )
            ) {
              setMessage("Kategori tersebut sudah tersedia.");
              return;
            }
            setBusy(true);
            setMessage("");
            try {
              if (await onAdd(parsed.data)) {
                setName("");
                setMessage("Kategori berhasil ditambahkan.");
              } else setMessage("Kategori belum tersimpan. Silakan coba lagi.");
            } catch {
              setMessage("Kategori belum tersimpan. Silakan coba lagi.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nama kategori baru
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Mis. Anak, Cicilan, Hewan Peliharaan"
              disabled={busy}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Tambah kategori"}
          </button>
        </form>
      )}
      {readOnly && (
        <p className="muted small">Kategori ruang dikelola pemilik.</p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <ul className="category-chips">
        {names.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
