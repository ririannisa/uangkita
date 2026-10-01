"use client";
import { useEffect, useState, type FormEvent } from "react";
import Dashboard from "./dashboard";
import { ArrowLeft, UsersRound, ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { money, today, type FinanceData } from "@/lib/finance";
import {
  sharedFigures,
  sharedRealization,
  type SharedFinance,
} from "@/lib/shared-finance";
import type { Space, SpaceDetails, SpaceOverview } from "@/lib/spaces";
import "./spaces.css";

async function api(url: string, body?: unknown) {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Tidak dapat memuat data.");
  return data;
}
export default function FinanceWorkspace({
  user,
  initialData,
}: {
  user: { id: string; name: string; email: string };
  initialData: FinanceData | null;
}) {
  const [overview, setOverview] = useState<SpaceOverview>({
    spaces: [],
    invitations: [],
    emailVerified: false,
  });
  const [selected, setSelected] = useState("");
  const [personalData, setPersonalData] = useState(initialData);
  const [personalVersion, setPersonalVersion] = useState(0);
  const [manage, setManage] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const load = async () => setOverview(await api("/api/spaces"));
  useEffect(() => {
    let alive = true;
    api("/api/spaces")
      .then((d) => {
        if (alive) setOverview(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/spaces", body);
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const space = overview.spaces.find((s) => s.id === selected);
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = otpSent
        ? await authClient.emailOtp.verifyEmail({
            email: user.email,
            otp: String(form.get("otp")),
          })
        : await authClient.emailOtp.sendVerificationOtp({
            email: user.email,
            type: "email-verification",
          });
      if (result.error) throw new Error(result.error.message);
      if (otpSent) {
        await load();
        setOtpSent(false);
      } else setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verifikasi gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {(manage || space) && (
        <div className="space-navigation">
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setPersonalData(await api("/api/finance"));
                setPersonalVersion((v) => v + 1);
                setManage(false);
                setSelected("");
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Saldo belum dapat dimuat.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <ArrowLeft size={18} /> Kembali ke beranda
          </button>
          {space && !manage && (
            <button className="text-button" onClick={() => setManage(true)}>
              <UsersRound size={18} /> Ruang Bersama
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="space-error" role="alert">
          {error}{" "}
          <button
            onClick={() =>
              load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            Coba lagi
          </button>
        </p>
      )}
      {manage && (
        <section className="space-manager">
          <h1 className="space-manager-title">
            <UsersRound size={30} /> Ruang Bersama
          </h1>
          <p>Uang sendiri, rencana bersama ✨</p>
          <div className="space-list">
            {overview.spaces.map((room) => (
              <button
                key={room.id}
                className="space-list-item"
                onClick={() => {
                  setSelected(room.id);
                  setManage(false);
                  window.scrollTo(0, 0);
                }}
              >
                <span className="quick-icon lavender">
                  <UsersRound size={26} />
                </span>
                <span>
                  <strong>{room.name}</strong>
                  <small>
                    {room.kind === "couple" ? "Pasangan" : "Keluarga"}
                  </small>
                </span>
                <ChevronRight size={20} />
              </button>
            ))}
            {!overview.spaces.length && (
              <p>
                Belum ada ruang. Buat ruang pertamamu untuk mencatat keuangan
                bersama.
              </p>
            )}
          </div>
          <h2>Buat ruang baru</h2>
          <p>
            Catatan pribadimu tetap privat. Undangan muncul saat penerima masuk
            dengan email yang sama dan berlaku 7 hari; tidak dikirim melalui
            email.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const result = await action({
                action: "create",
                name: f.get("name"),
                kind: f.get("kind"),
              });
              if (result) {
                setSelected(result.id);
                setManage(false);
                form.reset();
              }
            }}
          >
            <input
              name="name"
              placeholder="Nama ruang, mis. Rumah Kita"
              aria-label="Nama ruang"
              maxLength={80}
              required
            />
            <select className="app-select" name="kind" aria-label="Jenis ruang">
              <option value="couple">Pasangan</option>
              <option value="family">Keluarga</option>
            </select>
            <button disabled={busy}>Buat ruang</button>
          </form>
          {!!overview.invitations.length && (
            <>
              <h3>Undangan untukmu</h3>
              {!overview.emailVerified && (
                <form onSubmit={verify}>
                  <p>Verifikasi email untuk memastikan undangan ini milikmu.</p>
                  {otpSent && (
                    <input
                      name="otp"
                      placeholder="Kode dari email"
                      aria-label="Kode verifikasi"
                      required
                    />
                  )}
                  <button disabled={busy}>
                    {otpSent ? "Verifikasi kode" : "Kirim kode verifikasi"}
                  </button>
                </form>
              )}
              {overview.invitations.map((i) => (
                <div className="space-row" key={i.id}>
                  <span>{i.spaceName}</span>
                  <button
                    disabled={busy || !overview.emailVerified}
                    onClick={async () => {
                      const r = await action({
                        action: "accept",
                        invitationId: i.id,
                      });
                      if (r) {
                        setSelected(r.id);
                        setManage(false);
                      }
                    }}
                  >
                    Gabung
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action({ action: "decline", invitationId: i.id })
                    }
                  >
                    Tolak
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {!manage && space && (
        <SharedRoom
          key={space.id}
          space={space}
          userId={user.id}
          onSpaceAction={action}
          onDeleted={() => {
            setSelected("");
            setManage(true);
            window.scrollTo(0, 0);
          }}
        />
      )}
      <div hidden={manage || !!space}>
        <Dashboard
          key={personalVersion}
          user={user}
          initialData={personalData}
          invitationCount={overview.invitations.length}
          onOpenSpaces={() => {
            setManage(true);
            window.scrollTo(0, 0);
          }}
        />
      </div>
    </>
  );
}
function SharedRoom({
  space,
  userId,
  onSpaceAction,
  onDeleted,
}: {
  space: Space;
  userId: string;
  onSpaceAction: (a: unknown) => Promise<unknown>;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<SharedFinance | null>(null);
  const [details, setDetails] = useState<SpaceDetails | null>(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const endpoint = `/api/spaces/${space.id}/finance`;
  const load = async () => {
    const d = await api(endpoint);
    setData(d.finance);
    setDetails(d.details);
  };
  useEffect(() => {
    let alive = true;
    api(endpoint)
      .then((d) => {
        if (alive) {
          setData(d.finance);
          setDetails(d.details);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [endpoint]);
  async function mutate(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(endpoint, body);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const totals = data ? sharedFigures(data, month) : null;
  return (
    <main className="shared-room">
      <header>
        <span>
          {space.kind === "couple" ? "💕 RUANG PASANGAN" : "🏡 RUANG KELUARGA"}
        </span>
        <h1>{space.name}</h1>
        <p>Sedikit dicatat, banyak tenangnya.</p>
        <label>
          Periode{" "}
          <input
            type="month"
            value={month}
            min="2000-01"
            max="2100-12"
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
      </header>
      {error && (
        <p role="alert" className="space-error">
          {error}{" "}
          <button
            onClick={() =>
              load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            Coba lagi
          </button>
        </p>
      )}
      {!data ? (
        <p>Memuat ruang bersama…</p>
      ) : (
        <>
          <section className="shared-balance">
            <p>Saldo kas sampai akhir periode</p>
            <h2>{money(totals!.balance)}</h2>
            <div>
              Kontribusi bulan ini{" "}
              <strong>{money(totals!.contributions)}</strong>
            </div>
            <div>
              Pengeluaran bulan ini <strong>{money(totals!.expense)}</strong>
            </div>
          </section>
          <p className="space-note">
            Semua pengeluaran di sini dibayar dari kas bersama. Kontribusi
            otomatis mengurangi saldo pribadi pencatatnya sebagai transfer,
            bukan belanja. Saldo bulan sebelumnya dibawa ke periode berikutnya.
          </p>
          <div className="shared-grid">
            <section className="shared-card">
              <h2>Catat bareng</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    f = new FormData(form);
                  if (
                    await mutate({
                      action: "entry",
                      entry: {
                        id: crypto.randomUUID(),
                        type: f.get("type"),
                        amount: Number(f.get("amount")),
                        category: f.get("category"),
                        note: f.get("note"),
                        date: f.get("date"),
                        active: true,
                      },
                    })
                  )
                    form.reset();
                }}
              >
                <label>
                  Jenis
                  <select
                    className="app-select"
                    name="type"
                    aria-label="Jenis catatan"
                  >
                    <option value="contribution">Kontribusi ke kas</option>
                    <option value="out">Pengeluaran kas</option>
                  </select>
                </label>
                <label>
                  Jumlah (Rp)
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max="1000000000000"
                    step="1"
                    required
                  />
                </label>
                <label>
                  Kategori
                  <input
                    name="category"
                    list="shared-categories"
                    maxLength={80}
                    required
                    placeholder="Belanja, listrik, kontribusi…"
                  />
                </label>
                <datalist id="shared-categories">
                  {data.budgets
                    .filter((b) => b.month === month)
                    .map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                </datalist>
                <label>
                  Tanggal
                  <input
                    name="date"
                    type="date"
                    defaultValue={today()}
                    min="2000-01-01"
                    max="2100-12-31"
                    required
                  />
                </label>
                <label>
                  Catatan
                  <input
                    name="note"
                    maxLength={300}
                    placeholder="Mis. belanja mingguan"
                  />
                </label>
                <button disabled={busy}>Simpan catatan</button>
              </form>
            </section>
            <section className="shared-card">
              <h2>Anggaran & realisasi</h2>
              <p>Klik kategori untuk melihat transaksi terbesar.</p>
              {data.budgets
                .filter((b) => b.month === month)
                .map((b) => {
                  const r = sharedRealization(data, b);
                  return (
                    <details className="shared-budget" key={b.id}>
                      <summary>
                        <strong>{b.name}</strong>
                        <span>
                          {money(r.spent)} / {money(b.planned)}
                        </span>
                        <progress
                          max={b.planned}
                          value={Math.min(r.spent, b.planned)}
                        />
                        <small
                          className={r.spent > b.planned ? "over-budget" : ""}
                        >
                          {r.spent > b.planned
                            ? `Melebihi ${money(r.spent - b.planned)}`
                            : `Sisa ${money(b.planned - r.spent)}`}
                        </small>
                      </summary>
                      {!r.entries.length && <p>Belum ada pengeluaran.</p>}
                      {r.entries.map((e) => (
                        <div className="space-row" key={e.id}>
                          <span>
                            {e.note || e.category}
                            <small>
                              {e.authorName} · {e.date}
                            </small>
                          </span>
                          <strong>{money(e.amount)}</strong>
                        </div>
                      ))}
                      {space.role === "owner" && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                `Hapus anggaran ${b.name}? Transaksi tetap tersimpan.`,
                              )
                            )
                              mutate({
                                action: "delete",
                                kind: "budget",
                                id: b.id,
                              });
                          }}
                        >
                          Hapus anggaran
                        </button>
                      )}
                    </details>
                  );
                })}
              {!data.budgets.some((b) => b.month === month) && (
                <p>Belum ada anggaran untuk periode ini.</p>
              )}
              {space.role === "owner" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    if (
                      await mutate({
                        action: "budget",
                        budget: {
                          id: crypto.randomUUID(),
                          month,
                          name: f.get("name"),
                          planned: Number(f.get("planned")),
                        },
                      })
                    )
                      form.reset();
                  }}
                >
                  <label>
                    Kategori anggaran
                    <input name="name" maxLength={80} required />
                  </label>
                  <label>
                    Batas (Rp)
                    <input
                      name="planned"
                      type="number"
                      min="1"
                      step="1"
                      max="1000000000000"
                      required
                    />
                  </label>
                  <button disabled={busy}>Tambah anggaran</button>
                </form>
              )}
            </section>
          </div>
          <section className="shared-card">
            <h2>Aktivitas kas</h2>
            {!data.entries.some((e) => e.date.startsWith(month)) && (
              <p>Belum ada transaksi. Mulai dari kontribusi pertama ✨</p>
            )}
            {data.entries
              .filter((e) => e.date.startsWith(month))
              .map((e) => (
                <div className="space-row" key={e.id}>
                  <span>
                    <strong>{e.note || e.category}</strong>
                    <small>
                      {e.type === "contribution" ? "Kontribusi" : "Pengeluaran"}{" "}
                      · {e.category} · {e.authorName} · {e.date}
                    </small>
                  </span>
                  <strong>
                    {e.type === "contribution" ? "+" : "−"}
                    {money(e.amount)}
                  </strong>
                  {((space.role === "owner" && e.type !== "contribution") ||
                    e.authorId === userId) && (
                    <button
                      disabled={busy}
                      aria-label={`Hapus ${e.note || e.category}`}
                      onClick={() => {
                        if (
                          confirm(
                            "Hapus transaksi ini? Jika berupa kontribusi, transfer pribadi juga dibatalkan. Penghapusan tercatat di riwayat.",
                          )
                        )
                          mutate({ action: "delete", kind: "entry", id: e.id });
                      }}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
          </section>
        </>
      )}
      {details && (
        <section className="shared-card">
          <h2>Orang-orang di ruang ini</h2>
          {details.members.map((m) => (
            <div className="space-row" key={m.userId}>
              <span>
                {m.name}
                <small>
                  {m.email} ·{" "}
                  {m.userId === space.ownerId ? "Pemilik" : "Anggota"}
                </small>
              </span>
              {space.role === "owner" && m.userId !== space.ownerId && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      confirm(
                        `Hapus akses ${m.name}? Catatannya tetap tersimpan.`,
                      )
                    ) {
                      setBusy(true);
                      await onSpaceAction({
                        action: "removeMember",
                        spaceId: space.id,
                        userId: m.userId,
                      });
                      await load().catch((e) => setError(e.message));
                      setBusy(false);
                    }
                  }}
                >
                  Hapus akses
                </button>
              )}
            </div>
          ))}
          {space.role === "owner" && (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  setBusy(true);
                  const result = await onSpaceAction({
                    action: "invite",
                    spaceId: space.id,
                    email: new FormData(form).get("email"),
                  });
                  if (result) form.reset();
                  await load().catch((e) => setError(e.message));
                  setBusy(false);
                }}
              >
                <label>
                  Undang lewat alamat email
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="pasangan@email.com"
                  />
                </label>
                <button disabled={busy}>Buat undangan</button>
              </form>
              <p>
                Undangan tersedia di akun penerima, bukan dikirim melalui email.
              </p>
              {details.invitations.map((i) => (
                <div className="space-row" key={i.id}>
                  <span>
                    {i.email}
                    <small>Menunggu penerima bergabung</small>
                  </span>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await onSpaceAction({
                        action: "revoke",
                        spaceId: space.id,
                        invitationId: i.id,
                      });
                      await load().catch((e) => setError(e.message));
                      setBusy(false);
                    }}
                  >
                    Batalkan
                  </button>
                </div>
              ))}
            </>
          )}
          <details>
            <summary>Riwayat perubahan</summary>
            {details.events.map((e) => (
              <p key={e.id}>
                {e.actorName} · {e.action} ·{" "}
                {e.detail.name || e.detail.category}
                {e.detail.amount ? ` · ${money(e.detail.amount)}` : ""}
                <small> {new Date(e.createdAt).toLocaleString("id-ID")}</small>
              </p>
            ))}
          </details>
        </section>
      )}
      {space.role === "owner" && (
        <section className="shared-card space-danger">
          <h2>Hapus ruang</h2>
          <p>
            Seluruh transaksi, anggaran, anggota, undangan, dan riwayat ruang
            ini akan dihapus permanen. Tidak bisa dibatalkan. Transfer
            kontribusi seluruh anggota ikut dibatalkan dan saldo pribadinya
            dihitung ulang. Catatan pribadi lainnya tidak ikut terhapus.
          </p>
          {!deleteOpen ? (
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
            >
              Hapus ruang ini
            </button>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy || confirmation !== space.name) return;
                setBusy(true);
                const result = await onSpaceAction({
                  action: "deleteSpace",
                  spaceId: space.id,
                  confirmation,
                });
                if (result) onDeleted();
                else {
                  setBusy(false);
                  setError(
                    "Ruang belum berhasil dihapus. Periksa nama konfirmasi dan aksesmu, lalu coba lagi.",
                  );
                }
              }}
            >
              <label>
                Ketik nama ruang: {space.name}
                <input
                  aria-label="Konfirmasi nama ruang"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  maxLength={80}
                  autoComplete="off"
                  required
                />
              </label>
              <button
                className="danger-button"
                disabled={busy || confirmation !== space.name}
              >
                {busy ? "Menghapus…" : "Hapus ruang permanen"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmation("");
                }}
              >
                Batal
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
