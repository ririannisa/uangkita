"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import CategoryManager from "./category-manager";
import { categoryOptions } from "@/lib/categories";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Moon,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  Tags,
  Wallet,
  X,
  createLucideIcon,
  Utensils,
  Bus,
  ShoppingBag,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  backupSchema,
  dateLabel,
  emptyData,
  figures,
  creditFigures,
  inActivityMonth,
  money,
  monthLabel,
  mutationSchema,
  normalize,
  realization,
  today,
  type Budget,
  type Entry,
  type FinanceData,
  type Mutation,
} from "@/lib/finance";

const Chicken = createLucideIcon("chicken", [
  ["path", { d: "M14 5c-2-3 1-4 2-2 1-2 4-1 2 2", key: "comb" }],
  [
    "path",
    {
      d: "M13 10V8a4 4 0 0 1 8 0v4a7 7 0 0 1-7 7H9a6 6 0 0 1-6-6L2 7l5 3a6 6 0 0 1 6 0Z",
      key: "body",
    },
  ],
  ["path", { d: "m21 8 2 1-2 1", key: "beak" }],
  ["path", { d: "M18 8h.01", key: "eye" }],
  ["path", { d: "M8 12c0 3 3 5 6 2", key: "wing" }],
  ["path", { d: "M9 19v3H7m7-3v3h-2", key: "feet" }],
]);

type Tab = "home" | "activity" | "budget" | "savings" | "analytics" | "account";
type Modal =
  | { kind: "entry"; entry?: Entry; type: Entry["type"] }
  | { kind: "budget"; budget?: Budget }
  | { kind: "income" };
const labels: Record<Tab, string> = {
  home: "Beranda",
  activity: "Aktivitas",
  budget: "Anggaran",
  savings: "Tabungan",
  analytics: "Analitik",
  account: "Akun saya",
};
const typeLabels = {
  in: "Pemasukan",
  out: "Pengeluaran",
  deposit: "Setor tabungan",
  withdraw: "Tarik tabungan",
  fixed: "Pengeluaran tetap",
};

function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = /makan|minum/i.test(name)
    ? Utensils
    : /transport|bensin/i.test(name)
      ? Bus
      : /belanja/i.test(name)
        ? ShoppingBag
        : /tabungan/i.test(name)
          ? Chicken
          : Wallet;
  return <Icon size={size} strokeWidth={1.8} />;
}

export default function Dashboard({
  user,
  initialData,
  demo = false,
  onOpenSpaces,
  invitationCount = 0,
}: {
  user: { name: string; email: string };
  initialData: FinanceData | null;
  demo?: boolean;
  onOpenSpaces?: () => void;
  invitationCount?: number;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData ?? emptyData);
  const [loaded, setLoaded] = useState(initialData !== null);
  const [tab, setTab] = useState<Tab>("home");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [hidden, setHidden] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<Modal | null>(null);
  const [entryType, setEntryType] = useState<Entry["type"]>("out");
  const [paymentMethod, setPaymentMethod] = useState("direct");
  const [creditPaid, setCreditPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryDialog = useRef<HTMLDialogElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const f = figures(data, month);
  const budgets = data.budgets.filter((b) => b.month === month);
  const monthEntries = data.entries
    .filter((e) => inActivityMonth(e, month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const alerts = budgets.filter((b) => realization(data, b).percent >= 80);
  const totalPlanned = budgets.reduce((sum, b) => sum + b.planned, 0);
  const totalSpent = budgets.reduce(
    (sum, b) => sum + realization(data, b).spent,
    0,
  );
  const move = (next: Tab) => {
    setTab(next);
    setQuery("");
    setFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function reload() {
    const response = await fetch("/api/finance", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
    setLoaded(true);
  }

  async function mutate(action: Mutation) {
    if (pending.current) return false;
    const parsed = mutationSchema.safeParse(action);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ??
          "Periksa nominal, kategori, dan tanggal.",
      );
      return false;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    setFormError("");
    try {
      if (demo) {
        if (
          action.action === "budget" &&
          data.budgets.some(
            (b) =>
              b.id !== action.budget.id &&
              b.month === action.budget.month &&
              normalize(b.name) === normalize(action.budget.name),
          )
        )
          throw new Error("Kategori sudah memiliki anggaran pada bulan ini.");
        setData((current) => {
          if (action.action === "category")
            return {
              ...current,
              categories: [...(current.categories ?? []), action.name.trim()],
            };
          if (action.action === "entry")
            return {
              ...current,
              entries: [
                ...current.entries.filter((e) => e.id !== action.entry.id),
                action.entry,
              ],
            };
          if (action.action === "budget")
            return {
              ...current,
              budgets: [
                ...current.budgets.filter((b) => b.id !== action.budget.id),
                action.budget,
              ],
            };
          if (action.action === "income")
            return {
              ...current,
              plans: [
                ...current.plans.filter((p) => p.month !== action.plan.month),
                action.plan,
              ],
            };
          if (action.action === "delete")
            return {
              ...current,
              entries:
                action.kind === "entry"
                  ? current.entries.filter((e) => e.id !== action.id)
                  : current.entries,
              budgets:
                action.kind === "budget"
                  ? current.budgets.filter((b) => b.id !== action.id)
                  : current.budgets,
            };
          if (action.action === "import") return action.backup;
          if (action.action === "reset") return emptyData;
          return current;
        });
      } else {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        try {
          await reload();
        } catch {
          setLoaded(false);
          setMessage(
            "Perubahan tersimpan, tetapi tampilan belum diperbarui. Muat ulang data.",
          );
          return true;
        }
      }
      setMessage(
        demo
          ? "Contoh diperbarui. Perubahan demo hanya berlaku selama halaman ini dibuka."
          : "Perubahan berhasil disimpan.",
      );
      return true;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Perubahan belum tersimpan. Coba lagi.";
      setFormError(text);
      setMessage(text);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function open(next: Modal) {
    setModal(next);
    setFormError("");
    setCreditPaid(next.kind === "entry" && !!next.entry?.paidDate);
    setEntryType(next.kind === "entry" ? next.type : "out");
    setPaymentMethod(
      next.kind === "entry"
        ? (next.entry?.paymentMethod ?? "direct")
        : "direct",
    );
    setAmount(
      String(
        next.kind === "entry"
          ? (next.entry?.amount ?? "")
          : next.kind === "budget"
            ? (next.budget?.planned ?? "")
            : (data.plans.find((p) => p.month === month)?.income ?? ""),
      ),
    );
    dialog.current?.showModal();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    let action: Mutation;
    if (modal.kind === "income")
      action = { action: "income", plan: { month, income: Number(amount) } };
    else if (modal.kind === "budget")
      action = {
        action: "budget",
        budget: {
          id: modal.budget?.id ?? crypto.randomUUID(),
          month,
          name: String(form.get("category")).trim(),
          planned: Number(amount),
        },
      };
    else
      action = {
        action: "entry",
        entry: {
          id: modal.entry?.id ?? crypto.randomUUID(),
          type: entryType,
          amount: Number(amount),
          category:
            entryType === "deposit" || entryType === "withdraw"
              ? "Tabungan"
              : String(form.get("category")).trim(),
          note: String(form.get("note") ?? "").trim(),
          date: String(form.get("date")),
          active: entryType === "fixed" ? (modal.entry?.active ?? true) : true,
          paymentMethod:
            (entryType === "out" || entryType === "fixed") &&
            paymentMethod === "credit"
              ? "credit"
              : "direct",
          dueDate:
            (entryType === "out" || entryType === "fixed") &&
            paymentMethod === "credit"
              ? String(form.get("dueDate"))
              : null,
          paidDate:
            (entryType === "out" || entryType === "fixed") &&
            paymentMethod === "credit" &&
            creditPaid
              ? String(form.get("paidDate"))
              : null,
        },
      };
    if (
      action.action === "entry" &&
      entryType === "withdraw" &&
      Number(amount) >
        f.savings +
          (modal.kind === "entry" && modal.entry?.type === "withdraw"
            ? modal.entry.amount
            : 0)
    ) {
      setFormError("Nominal penarikan melebihi total tabungan.");
      return;
    }
    if (await mutate(action)) {
      dialog.current?.close();
      if (action.action === "entry")
        setMonth((action.entry.paidDate ?? action.entry.date).slice(0, 7));
    }
  }

  async function remove(kind: "entry" | "budget", id: string) {
    if (
      !confirm(
        kind === "entry"
          ? "Hapus transaksi ini? Saldo akan dihitung ulang."
          : "Hapus anggaran ini? Transaksi tetap tersimpan.",
      )
    )
      return false;
    return mutate({ action: "delete", kind, id });
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              ...data,
              entries: data.entries.filter((e) => !e.spaceId),
            },
            null,
            2,
          ),
        ],
        {
          type: "application/json",
        },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `uangkita-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 4_000_000) {
      setMessage("File maksimal 4 MB.");
      return;
    }
    try {
      const parsed = backupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          "Format tidak sesuai. Gunakan cadangan dari aplikasi UangKita versi web ini.",
        );
      if (
        confirm(
          "Ganti catatan pribadi dengan cadangan ini? Transfer Ruang Bersama tetap mengikuti kontribusi aslinya dan tidak diganti. Ekspor data sekarang sebelum melanjutkan.",
        )
      )
        await mutate({ action: "import", backup: parsed.data });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "File cadangan tidak valid.",
      );
    }
  }
  function shift(delta: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    const next = date.toISOString().slice(0, 7);
    if (next >= "2000-01" && next <= "2100-12") setMonth(next);
  }
  function transactionRows(entries: Entry[], editable = true) {
    return entries.length ? (
      entries.map((e) => (
        <div className="transaction" key={e.id}>
          <span
            className={`category-icon ${e.type === "in" || e.type === "deposit" ? "mint" : ""}`}
          >
            <CategoryIcon name={e.category} />
          </span>
          <div className="transaction-info">
            <strong>{e.note || e.category}</strong>
            <span>
              {e.category} · {dateLabel(e.date)}
              {!e.active ? " · Nonaktif" : ""}
            </span>
            {(e.type === "out" || e.type === "fixed") && !e.spaceId && (
              <span>
                {e.paymentMethod === "credit"
                  ? `Kredit · Jatuh tempo ${e.dueDate?.split("-").reverse().join("/")} · ${e.paidDate ? `Lunas ${e.paidDate.split("-").reverse().join("/")}` : "Belum lunas"}`
                  : "Pembayaran langsung"}
              </span>
            )}
          </div>
          <div className="transaction-value">
            <strong
              className={
                e.type === "in" || e.type === "deposit" ? "positive" : ""
              }
            >
              {e.type === "in" || e.type === "deposit" ? "+" : "−"}
              {money(e.amount)}
            </strong>
            <span>{e.spaceId ? "Transfer bersama" : typeLabels[e.type]}</span>
          </div>
          {editable && !e.spaceId && (
            <button
              className="icon-button row-edit"
              aria-label={`Edit ${e.note || e.category}`}
              onClick={() => open({ kind: "entry", entry: e, type: e.type })}
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      ))
    ) : (
      <div className="empty-state">
        <ReceiptText size={30} />
        <strong>Belum ada transaksi</strong>
        <p>Mulai catat pengeluaran atau pemasukanmu.</p>
        <button
          className="text-button"
          onClick={() => open({ kind: "entry", type: "out" })}
        >
          Catat transaksi <Plus size={15} />
        </button>
      </div>
    );
  }
  function budgetCard(b: Budget, compact = false) {
    const r = realization(data, b);
    return (
      <article
        className={`budget-card ${r.remaining < 0 ? "over-budget" : ""}`}
        key={b.id}
      >
        <div className="budget-heading">
          <span className="category-icon">
            <CategoryIcon name={b.name} />
          </span>
          <div>
            <h3>{b.name}</h3>
            <span
              className={`badge ${r.remaining < 0 ? "danger" : r.percent >= 80 ? "warning" : "safe"}`}
            >
              {r.remaining < 0
                ? "Melebihi anggaran"
                : r.percent >= 80
                  ? "Mendekati batas"
                  : "Masih sesuai rencana"}
            </span>
          </div>
          {!compact && (
            <button
              className="icon-button"
              aria-label={`Edit anggaran ${b.name}`}
              onClick={() => open({ kind: "budget", budget: b })}
            >
              <Pencil size={17} />
            </button>
          )}
        </div>
        <div className="budget-numbers">
          <strong>{money(r.spent)}</strong>
          <span>dari {money(b.planned)}</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`Realisasi ${b.name}`}
          aria-valuenow={Math.min(100, r.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${r.percent}% dari anggaran`}
        >
          <span style={{ width: `${Math.min(100, r.percent)}%` }} />
        </div>
        <div className="budget-caption">
          <span>
            {r.remaining < 0
              ? `Lebih ${money(-r.remaining)}`
              : `Sisa ${money(r.remaining)}`}
          </span>
          <b>{r.percent}% terpakai</b>
        </div>
        {!compact && (
          <>
            <div className="largest-expense">
              <ArrowUpRight size={18} />
              <div>
                <span>Transaksi terbesar</span>
                <strong>
                  {r.transactions[0]?.note ||
                    r.transactions[0]?.category ||
                    "Belum ada pengeluaran"}
                </strong>
              </div>
              {r.transactions[0] && <b>{money(r.transactions[0].amount)}</b>}
            </div>
            <details className="budget-details">
              <summary>
                {r.transactions.length} transaksi · lihat realisasi
                <ChevronRight size={16} />
              </summary>
              <p className="small muted">
                Diurutkan dari nominal terbesar · {monthLabel(month)}
              </p>
              {transactionRows(r.transactions)}
            </details>
          </>
        )}
      </article>
    );
  }

  return (
    <div className="app-shell">
      <dialog
        ref={categoryDialog}
        className="entry-dialog"
        aria-labelledby="category-title"
      >
        <div className="dialog-heading">
          <h2 id="category-title">Kelola Kategori</h2>
          <button
            className="icon-button"
            aria-label="Tutup kategori"
            onClick={() => categoryDialog.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <CategoryManager
          names={categoryOptions(data)}
          onAdd={(name) => mutate({ action: "category", name })}
        />
      </dialog>
      <aside className="desktop-sidebar">
        <Link href="/" className="brand">
          Uang<span>Kita</span>
        </Link>
        <p className="sidebar-caption">KEUANGAN PRIBADIMU</p>
        <nav>
          {(
            [
              ["home", Home],
              ["activity", ReceiptText],
              ["budget", Target],
              ["savings", Chicken],
              ["analytics", ChartNoAxesCombined],
              ["account", UserRound],
            ] as const
          ).map(([key, Icon]) => (
            <button
              key={key}
              className={tab === key ? "selected" : ""}
              onClick={() => move(key)}
            >
              <Icon size={21} />
              {labels[key]}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={28} />
          <strong>
            Rencana baik dimulai
            <br />
            dari kebiasaan kecil.
          </strong>
          <p>Catat hari ini, tenang esok hari.</p>
        </div>
      </aside>
      <div className="app-main">
        {demo && (
          <div className="demo-banner">
            Mode contoh · data simulasi{" "}
            <Link href="/login">
              Masuk ke akun <ArrowRight size={13} />
            </Link>
          </div>
        )}
        <header className={`app-header ${tab === "home" ? "home-header" : ""}`}>
          <div className="header-top">
            <div className="mobile-brand brand">
              Uang<span>Kita</span>
            </div>
            <span className="desktop-welcome">Ruang keuangan pribadimu</span>
            <div className="header-actions">
              <button
                type="button"
                className="icon-button theme-toggle"
                aria-label="Ganti tema terang atau gelap"
                title="Ganti tema terang atau gelap"
                onClick={() => {
                  const theme =
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark";
                  document.documentElement.dataset.theme = theme;
                  try {
                    localStorage.setItem("uangkita-theme", theme);
                  } catch {
                    // The toggle still works when browser storage is unavailable.
                  }
                }}
              >
                <Moon size={20} className="theme-moon" />
                <Sun size={20} className="theme-sun" />
              </button>
              <button
                className="icon-button"
                aria-label="Lihat peringatan anggaran"
                onClick={() => move("budget")}
              >
                <Bell size={21} />
                {alerts.length > 0 && <i />}
              </button>
              <button
                className="avatar"
                aria-label="Buka akun"
                onClick={() => move("account")}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </button>
            </div>
          </div>
          <div className="greeting">
            <div>
              <p>
                {tab === "home"
                  ? "HALO, " + user.name.toUpperCase()
                  : "UANGKITA / " + labels[tab].toUpperCase()}
              </p>
              <h1>
                {tab === "home" ? "Keuangan rapi, hati tenang." : labels[tab]}
              </h1>
            </div>
            <div className="period">
              <button aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>
                <ChevronLeft size={17} />
              </button>
              <span>{monthLabel(month)}</span>
              <button aria-label="Bulan berikutnya" onClick={() => shift(1)}>
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          {tab === "home" && (
            <div className="balance-card">
              <div className="balance-card-top">
                <span>
                  <Wallet size={17} /> DOMPET PRIBADI
                </span>
                <span>Rupiah · IDR</span>
              </div>
              <div className="balance-card-body">
                <div className="balance-label">
                  Sisa saldo bulan ini
                  <button
                    className="icon-button"
                    aria-label={
                      hidden ? "Tampilkan saldo" : "Sembunyikan saldo"
                    }
                    onClick={() => setHidden(!hidden)}
                  >
                    {hidden ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                </div>
                <strong
                  className={`balance-amount ${f.balance < 0 ? "negative" : ""}`}
                >
                  {hidden ? "Rp ••••••••" : money(f.balance)}
                </strong>
                <button
                  className="balance-link"
                  onClick={() => move("activity")}
                >
                  <ReceiptText size={17} /> Lihat aktivitas keuangan{" "}
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </header>
        {tab === "home" && f.transferred > 0 && (
          <p className="notice">
            Transfer ke Ruang Bersama bulan ini:{" "}
            {hidden ? "••••••" : money(f.transferred)}. Sudah mengurangi saldo,
            tidak dihitung sebagai belanja.
          </p>
        )}
        <main className="page-content">
          {!loaded && (
            <div className="notice" role="alert">
              Data belum dapat dimuat.{" "}
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await reload();
                  } catch {
                    setMessage("Belum terhubung. Coba lagi nanti.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Muat ulang
              </button>
            </div>
          )}
          {message && (
            <div className="feedback" role="status">
              <span>{message}</span>
              <button
                className="icon-button"
                aria-label="Tutup pemberitahuan"
                onClick={() => setMessage("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <fieldset className="content-fieldset" disabled={!loaded || busy}>
            {tab === "home" && (
              <>
                <div className="summary-grid">
                  <button onClick={() => open({ kind: "income" })}>
                    <span className="mini-icon mint">
                      <ArrowDownLeft size={19} />
                    </span>
                    <div>
                      <span>Pemasukan</span>
                      <strong>{hidden ? "••••••" : money(f.income)}</strong>
                    </div>
                  </button>
                  <button onClick={() => move("activity")}>
                    <span className="mini-icon peach">
                      <ArrowUpRight size={19} />
                    </span>
                    <div>
                      <span>Pengeluaran</span>
                      <strong>{hidden ? "••••••" : money(f.expense)}</strong>
                    </div>
                  </button>
                  <button onClick={() => move("savings")}>
                    <span className="mini-icon lavender">
                      <Chicken size={19} />
                    </span>
                    <div>
                      <span>Ditabung bulan ini</span>
                      <strong>{hidden ? "••••••" : money(f.saved)}</strong>
                    </div>
                  </button>
                </div>
                {f.cashExpense !== f.expense && (
                  <p className="small muted">
                    Pembayaran bulan ini:{" "}
                    {hidden ? "Rp ••••••••" : money(f.cashExpense)}. Saldo
                    mengikuti tanggal pembayaran; pengeluaran mengikuti tanggal
                    transaksi.
                  </p>
                )}
                <section className="section">
                  <div className="section-heading">
                    <h2>Menu utama</h2>
                    <span className="muted small">Semua dalam satu tempat</span>
                  </div>
                  <div className="quick-menu">
                    {(
                      [
                        ["Catat transaksi", ReceiptText, "entry", "sky"],
                        ["Anggaran", Target, "budget", "mint"],
                        ["Tabungan", Chicken, "savings", "lavender"],
                        ["Analitik", ChartNoAxesCombined, "analytics", "peach"],
                        ["Pengeluaran tetap", Wallet, "fixed", "sky"],
                        ["Pendapatan", ArrowDownLeft, "income", "mint"],
                        ["Ruang Bersama", UsersRound, "spaces", "lavender"],
                        ["Kelola Kategori", Tags, "categories", "mint"],
                      ] as const
                    ).map(([label, Icon, action, color]) => (
                      <button
                        key={label}
                        onClick={() => {
                          if (action === "categories")
                            categoryDialog.current?.showModal();
                          else if (action === "spaces") {
                            if (onOpenSpaces) onOpenSpaces();
                            else router.push("/login");
                          } else if (action === "entry")
                            open({ kind: "entry", type: "out" });
                          else if (action === "income")
                            open({ kind: "income" });
                          else if (action === "fixed") {
                            move("activity");
                            setFilter("fixed");
                          } else move(action);
                        }}
                      >
                        <span className={`quick-icon ${color}`}>
                          <Icon size={27} strokeWidth={1.7} />
                          {action === "spaces" && invitationCount > 0 && (
                            <span
                              className="space-invite-count"
                              aria-label={`${invitationCount} undangan`}
                            >
                              {invitationCount}
                            </span>
                          )}
                        </span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <button
                  className={`insight-banner ${alerts.length ? "has-alert" : ""}`}
                  onClick={() => move("budget")}
                >
                  <span className="insight-icon">
                    {alerts.length ? (
                      <AlertCircle size={25} />
                    ) : (
                      <Target size={25} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {alerts.length
                        ? `${alerts.length} anggaran perlu perhatianmu`
                        : "Sedikit direncanakan, banyak ketenangan."}
                    </strong>
                    <p>
                      {alerts.length
                        ? "Lihat realisasi dan pengeluaran terbesarnya."
                        : "Atur batas pengeluaran untuk hal-hal yang penting."}
                    </p>
                  </div>
                  <ChevronRight size={20} />
                </button>
                <div className="home-columns">
                  <section className="section">
                    <div className="section-heading">
                      <h2>Pantau anggaran</h2>
                      <button
                        className="text-button"
                        onClick={() => move("budget")}
                      >
                        Lihat semua <ChevronRight size={15} />
                      </button>
                    </div>
                    {budgets.length ? (
                      budgets.slice(0, 3).map((b) => (
                        <button
                          className="compact-budget-button"
                          key={b.id}
                          onClick={() => move("budget")}
                        >
                          {budgetCard(b, true)}
                        </button>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Target size={30} />
                        <strong>Beri arah untuk uangmu</strong>
                        <p>Buat anggaran kategori pertamamu.</p>
                        <button
                          className="text-button"
                          onClick={() => open({ kind: "budget" })}
                        >
                          Buat anggaran <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </section>
                  <section className="section">
                    <div className="section-heading">
                      <h2>Aktivitas terbaru</h2>
                      <button
                        className="text-button"
                        onClick={() => move("activity")}
                      >
                        Semua <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="panel">
                      {transactionRows(monthEntries.slice(0, 5), false)}
                    </div>
                    <div className="saving-teaser">
                      <Chicken size={32} />
                      <div>
                        <span>Langkah kecilmu sudah terkumpul</span>
                        <strong>{hidden ? "••••••" : money(f.savings)}</strong>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Lihat tabungan"
                        onClick={() => move("savings")}
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}
            {tab === "activity" && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>Semua aktivitas</h2>
                    <p className="muted small">
                      Termasuk kredit belum lunas dari bulan sebelumnya dan
                      kredit yang dibayar pada bulan ini.
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() =>
                      open({
                        kind: "entry",
                        type: filter === "fixed" ? "fixed" : "out",
                      })
                    }
                  >
                    <Plus size={17} /> Catat
                  </button>
                </div>
                <div className="search-field">
                  <Search size={19} />
                  <input
                    aria-label="Cari transaksi"
                    placeholder="Cari catatan atau kategori…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="filter-tabs">
                  {[
                    ["all", "Semua"],
                    ["out", "Pengeluaran"],
                    ["in", "Pemasukan"],
                    ["fixed", "Tetap"],
                    ["transfer", "Transfer bersama"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={filter === value}
                      className={filter === value ? "active" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {filter === "fixed" && (
                  <p className="notice">
                    Pengeluaran tetap dicatat per bulan agar riwayat tetap
                    akurat. Buat catatan baru untuk tagihan bulan berikutnya.
                  </p>
                )}
                <div className="panel">
                  {transactionRows(
                    monthEntries.filter(
                      (e) =>
                        (filter === "all" ||
                          (filter === "transfer"
                            ? !!e.spaceId
                            : !e.spaceId && e.type === filter)) &&
                        normalize(e.note + e.category).includes(
                          normalize(query),
                        ),
                    ),
                  )}
                </div>
              </>
            )}
            {tab === "budget" && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>Rencana & realisasi</h2>
                    <p className="muted small">
                      Kenali pengeluaranmu, kategori demi kategori.
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => open({ kind: "budget" })}
                  >
                    <Plus size={17} /> Anggaran
                  </button>
                </div>
                <div className="budget-overview">
                  <div>
                    <span>Total rencana</span>
                    <strong>{money(totalPlanned)}</strong>
                  </div>
                  <div>
                    <span>Sudah terealisasi</span>
                    <strong>{money(totalSpent)}</strong>
                  </div>
                  <div>
                    <span>
                      {totalPlanned - totalSpent < 0
                        ? "Melebihi rencana"
                        : "Sisa alokasi"}
                    </span>
                    <strong
                      className={
                        totalPlanned < totalSpent ? "negative" : "positive"
                      }
                    >
                      {money(Math.abs(totalPlanned - totalSpent))}
                    </strong>
                  </div>
                </div>
                <p className="small muted">
                  Realisasi mencakup transaksi keluar dan pengeluaran tetap
                  aktif pada kategori yang sama. Buka rincian untuk melihat
                  transaksi terbesar.
                </p>
                <div className="budget-grid">
                  {budgets.map((b) => budgetCard(b))}
                </div>
                {!budgets.length && (
                  <div className="empty-state">
                    <Target size={35} />
                    <strong>
                      Belum ada anggaran untuk {monthLabel(month)}
                    </strong>
                    <p>Mulai dari makan, transportasi, atau kebutuhan rutin.</p>
                    <button
                      className="primary"
                      onClick={() => open({ kind: "budget" })}
                    >
                      Buat anggaran pertama
                    </button>
                  </div>
                )}
              </>
            )}
            {tab === "savings" && (
              <>
                <div className="savings-card">
                  <div className="savings-art">
                    <Chicken size={50} strokeWidth={1.4} />
                  </div>
                  <p>Total tabungan · seluruh periode</p>
                  <h2>{money(f.savings)}</h2>
                  <span>Satu langkah lebih dekat ke tujuanmu.</span>
                  <div className="two-buttons">
                    <button
                      className="primary"
                      onClick={() => open({ kind: "entry", type: "deposit" })}
                    >
                      <Plus size={17} /> Setor tabungan
                    </button>
                    <button
                      className="secondary"
                      onClick={() => open({ kind: "entry", type: "withdraw" })}
                    >
                      <ArrowUpRight size={17} /> Tarik
                    </button>
                  </div>
                </div>
                <div className="section-heading">
                  <h2>Riwayat tabungan</h2>
                  <span className="muted small">Semua periode</span>
                </div>
                <div className="panel">
                  {transactionRows(
                    data.entries
                      .filter(
                        (e) => e.type === "deposit" || e.type === "withdraw",
                      )
                      .sort((a, b) => b.date.localeCompare(a.date)),
                  )}
                </div>
              </>
            )}
            {tab === "analytics" && <Analytics data={data} month={month} />}
            {tab === "account" && (
              <>
                <section className="profile-card">
                  <span className="avatar large">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                    <span className="badge safe">
                      <ShieldCheck size={12} />{" "}
                      {demo ? "Akun contoh" : "Akun pribadi"}
                    </span>
                  </div>
                </section>
                <div className="section-heading">
                  <h2>Pengaturan keuangan</h2>
                </div>
                <div className="panel settings-list">
                  <button onClick={() => open({ kind: "income" })}>
                    <span className="category-icon">
                      <Wallet size={20} />
                    </span>
                    <div>
                      <strong>Pendapatan bulanan</strong>
                      <span>
                        {monthLabel(month)} ·{" "}
                        {money(
                          data.plans.find((p) => p.month === month)?.income ??
                            0,
                        )}
                      </span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={exportBackup}>
                    <span className="category-icon">
                      <Download size={20} />
                    </span>
                    <div>
                      <strong>Ekspor cadangan</strong>
                      <span>
                        Catatan pribadi; transfer bersama tetap di ruang asal
                      </span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => importInput.current?.click()}>
                    <span className="category-icon">
                      <Upload size={20} />
                    </span>
                    <div>
                      <strong>Pulihkan cadangan</strong>
                      <span>Impor file cadangan UangKita versi web</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                  <input
                    ref={importInput}
                    type="file"
                    hidden
                    accept="application/json"
                    onChange={(e) => {
                      void importBackup(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="account-note">
                  <ShieldCheck size={21} />
                  <p>
                    {demo
                      ? "Ini ruang mencoba. Data contoh tidak tersimpan ke akun dan akan kembali seperti semula saat halaman dimuat ulang."
                      : "Catatanmu tersimpan pada akunmu. Ekspor cadangan secara berkala untuk menyimpan salinan pribadi."}
                  </p>
                </div>
                <button
                  className="danger-button full"
                  onClick={() => {
                    if (
                      prompt(
                        "Catatan pribadi akan dihapus. Kontribusi dan transfer Ruang Bersama tidak ikut dihapus; kelola dari ruang asal. Ketik HAPUS untuk melanjutkan.",
                      ) === "HAPUS"
                    )
                      void mutate({ action: "reset", confirmation: "HAPUS" });
                  }}
                >
                  <Trash2 size={18} /> Hapus data keuangan
                </button>
                <button
                  className="secondary full logout"
                  onClick={async () => {
                    if (demo) {
                      router.replace("/login");
                      router.refresh();
                      return;
                    }
                    setBusy(true);
                    try {
                      const result = await authClient.signOut();
                      if (result.error) throw new Error();
                      router.replace("/login");
                      router.refresh();
                    } catch {
                      setMessage("Belum berhasil keluar. Coba lagi.");
                      setBusy(false);
                    }
                  }}
                >
                  <LogOut size={18} />{" "}
                  {demo ? "Kembali ke login" : "Keluar dari akun"}
                </button>
              </>
            )}
          </fieldset>
          <p className="page-footer">
            UangKita <span>Teman baik keuanganmu.</span>
          </p>
        </main>
        <nav className="bottom-nav" aria-label="Navigasi utama">
          <button
            className={tab === "home" ? "active" : ""}
            onClick={() => move("home")}
          >
            <Home size={22} />
            Beranda
          </button>
          <button
            className={tab === "activity" ? "active" : ""}
            onClick={() => move("activity")}
          >
            <ReceiptText size={22} />
            Aktivitas
          </button>
          <button
            className="nav-create"
            disabled={!loaded || busy}
            onClick={() => open({ kind: "entry", type: "out" })}
          >
            <span>
              <Plus size={29} />
            </span>
            Catat
          </button>
          <button
            className={tab === "budget" ? "active" : ""}
            onClick={() => move("budget")}
          >
            <Target size={22} />
            Anggaran
          </button>
          <button
            className={tab === "account" ? "active" : ""}
            onClick={() => move("account")}
          >
            <UserRound size={22} />
            Akun saya
          </button>
        </nav>
      </div>
      <dialog
        aria-labelledby="entry-dialog-title"
        ref={dialog}
        className="entry-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClick={(e) => {
          if (e.target === dialog.current && !busy) dialog.current.close();
        }}
      >
        {modal && (
          <form
            onSubmit={submit}
            key={
              modal.kind +
              (modal.kind === "entry"
                ? modal.entry?.id
                : modal.kind === "budget"
                  ? modal.budget?.id
                  : month)
            }
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow blue">{monthLabel(month)}</span>
                <h2 id="entry-dialog-title">
                  {modal.kind === "income"
                    ? "Pendapatan bulanan"
                    : modal.kind === "budget"
                      ? modal.budget
                        ? "Edit anggaran"
                        : "Buat anggaran"
                      : modal.entry
                        ? "Edit transaksi"
                        : "Catat transaksi"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Tutup formulir"
                disabled={busy}
                onClick={() => dialog.current?.close()}
              >
                <X size={22} />
              </button>
            </div>
            <fieldset disabled={busy}>
              {modal.kind === "entry" && (
                <label>
                  Jenis transaksi
                  <select
                    className="app-select"
                    aria-label="Jenis transaksi"
                    value={entryType}
                    onChange={(e) =>
                      setEntryType(e.target.value as Entry["type"])
                    }
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {modal.kind === "budget" ? "Batas anggaran" : "Nominal"}
                <div className="amount-input">
                  <span>Rp</span>
                  <input
                    aria-label="Nominal"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString("id-ID") : ""}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/\D/g, "").slice(0, 13))
                    }
                    required={modal.kind !== "income"}
                    placeholder="0"
                  />
                </div>
              </label>
              <div className="amount-chips">
                {[50000, 100000, 500000, 1000000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                  >
                    {n === 1000000 ? "1 juta" : n / 1000 + " ribu"}
                  </button>
                ))}
              </div>
              {(modal.kind === "budget" ||
                (modal.kind === "entry" &&
                  entryType !== "deposit" &&
                  entryType !== "withdraw")) && (
                <label>
                  Kategori
                  <input
                    name="category"
                    list="categories"
                    required
                    maxLength={80}
                    defaultValue={
                      modal.kind === "budget"
                        ? modal.budget?.name
                        : modal.entry?.category
                    }
                    placeholder="Pilih atau tulis kategori"
                  />
                  <datalist id="categories">
                    {categoryOptions(data).map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>
              )}
              {modal.kind === "entry" && (
                <>
                  <label>
                    Catatan <span className="muted">(opsional)</span>
                    <input
                      name="note"
                      maxLength={300}
                      defaultValue={modal.entry?.note}
                      placeholder="Contoh: Belanja kebutuhan dapur"
                    />
                  </label>
                  <label>
                    Tanggal
                    <input
                      type="date"
                      name="date"
                      required
                      min="2000-01-01"
                      max="2100-12-31"
                      defaultValue={
                        modal.entry?.date ??
                        (month === today().slice(0, 7)
                          ? today()
                          : month + "-01")
                      }
                    />
                  </label>
                  {(entryType === "out" || entryType === "fixed") && (
                    <>
                      <label>
                        Pembayaran
                        <select
                          className="app-select"
                          aria-label="Pembayaran"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="direct">
                            Langsung (bukan kredit)
                          </option>
                          <option value="credit">Kredit</option>
                        </select>
                      </label>
                      {paymentMethod === "credit" && (
                        <>
                          <label>
                            Jatuh tempo
                            <input
                              name="dueDate"
                              type="date"
                              required
                              min="2000-01-01"
                              max="2100-12-31"
                              defaultValue={modal.entry?.dueDate ?? ""}
                            />
                          </label>
                          <label>
                            Status kredit
                            <select
                              className="app-select"
                              aria-label="Status kredit"
                              value={creditPaid ? "paid" : "unpaid"}
                              onChange={(e) =>
                                setCreditPaid(e.target.value === "paid")
                              }
                            >
                              <option value="unpaid">Belum lunas</option>
                              <option value="paid">Lunas</option>
                            </select>
                          </label>
                          {creditPaid && (
                            <label>
                              Tanggal pembayaran
                              <input
                                name="paidDate"
                                type="date"
                                required
                                min="2000-01-01"
                                max="2100-12-31"
                                defaultValue={modal.entry?.paidDate ?? ""}
                              />
                            </label>
                          )}
                        </>
                      )}
                      <p className="small muted">
                        Pengeluaran dan anggaran mengikuti tanggal transaksi.
                        Kredit mengurangi saldo saat lunas, sesuai tanggal
                        pembayaran.
                      </p>
                    </>
                  )}
                  {entryType === "fixed" && (
                    <p className="small muted">
                      Dihitung dalam realisasi anggaran kategori pada bulan
                      transaksi.
                    </p>
                  )}
                </>
              )}
              {modal.kind === "income" && (
                <p className="small muted">
                  Berlaku untuk {monthLabel(month)} saja. Pemasukan tambahan
                  dapat dicatat melalui transaksi.
                </p>
              )}
              {formError && (
                <p className="notice" role="alert">
                  {formError}
                </p>
              )}
              <button className="primary full" type="submit">
                {busy ? "Menyimpan…" : "Simpan"}
                <Check size={18} />
              </button>
              {modal.kind === "entry" && modal.entry && (
                <div className="edit-actions">
                  {modal.entry.type === "fixed" && (
                    <button
                      className="secondary full"
                      type="button"
                      onClick={async () => {
                        if (
                          modal.entry &&
                          (await mutate({
                            action: "entry",
                            entry: {
                              ...modal.entry,
                              active: !modal.entry.active,
                            },
                          }))
                        )
                          dialog.current?.close();
                      }}
                    >
                      {modal.entry.active
                        ? "Nonaktifkan bulan ini"
                        : "Aktifkan kembali"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="danger-button full"
                    onClick={async () => {
                      if (
                        modal.entry &&
                        (await remove("entry", modal.entry.id))
                      ) {
                        dialog.current?.close();
                      }
                    }}
                  >
                    <Trash2 size={17} /> Hapus transaksi
                  </button>
                </div>
              )}
              {modal.kind === "budget" && modal.budget && (
                <button
                  type="button"
                  className="danger-button full logout"
                  onClick={async () => {
                    if (
                      modal.budget &&
                      (await remove("budget", modal.budget.id))
                    ) {
                      dialog.current?.close();
                    }
                  }}
                >
                  <Trash2 size={17} /> Hapus anggaran
                </button>
              )}
            </fieldset>
          </form>
        )}
      </dialog>
    </div>
  );
}

function Analytics({ data, month }: { data: FinanceData; month: string }) {
  const periods = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 5 + i);
    const key = date.toISOString().slice(0, 7);
    return { key, ...figures(data, key), credit: creditFigures(data, key) };
  });
  const max = Math.max(1, ...periods.flatMap((p) => [p.income, p.cashExpense]));
  const credit = creditFigures(data, month);
  const creditMax = Math.max(
    1,
    ...periods.flatMap((p) => [p.credit.borrowed, p.credit.paid]),
  );
  const percentLabel = (value: number | null) =>
    value === null
      ? "Belum ada pemasukan"
      : `${value.toLocaleString("id-ID")}% dari pemasukan`;
  const grouped = new Map<string, { name: string; amount: number }>();
  for (const e of data.entries.filter(
    (e) =>
      e.active &&
      !e.spaceId &&
      e.date.startsWith(month) &&
      (e.type === "out" || e.type === "fixed"),
  )) {
    const key = normalize(e.category);
    const previous = grouped.get(key);
    grouped.set(key, {
      name: previous?.name ?? e.category,
      amount: (previous?.amount ?? 0) + e.amount,
    });
  }
  const categories = [...grouped.values()].sort((a, b) => b.amount - a.amount);
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  return (
    <>
      <div className="budget-overview analytics-overview">
        <div>
          <span>Kategori terbesar</span>
          <strong>{categories[0]?.name ?? "Belum ada"}</strong>
        </div>
        <div>
          <span>Rata-rata per hari kalender</span>
          <strong>{money(total / days)}</strong>
        </div>
      </div>
      <section className="panel chart-panel">
        <h2>Arus kas 6 bulan</h2>
        <p className="muted small">
          Pendapatan dan pembayaran aktual, termasuk pelunasan kredit.
        </p>
        <div className="chart-legend">
          <span>
            <i className="income-dot" /> Pemasukan
          </span>
          <span>
            <i className="expense-dot" /> Pengeluaran
          </span>
        </div>
        <div className="bar-chart">
          {periods.map((p) => (
            <div className="bar-column" key={p.key}>
              <div className="bars">
                <div
                  className="bar income-bar"
                  style={{ height: `${(p.income / max) * 100}%` }}
                  title={`Pemasukan ${money(p.income)}`}
                />
                <div
                  className="bar expense-bar"
                  style={{ height: `${(p.cashExpense / max) * 100}%` }}
                  title={`Pembayaran ${money(p.cashExpense)}`}
                />
              </div>
              <span>{monthLabel(p.key).split(" ")[0].slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <details className="chart-table">
          <summary>Lihat angka lengkap</summary>
          <table>
            <caption>Arus kas enam bulan</caption>
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Masuk</th>
                <th>Keluar</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.key}>
                  <td>{monthLabel(p.key)}</td>
                  <td>{money(p.income)}</td>
                  <td>{money(p.cashExpense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <section
        className="panel chart-panel credit-analytics"
        aria-labelledby="credit-analytics-title"
      >
        <h2 id="credit-analytics-title">Kredit & pemasukan</h2>
        <p className="muted small">
          {monthLabel(month)} · Pemasukan {money(credit.income)}
        </p>
        <div className="budget-overview analytics-overview">
          <div>
            <span>Kredit baru bulan ini</span>
            <strong>{money(credit.borrowed)}</strong>
            <span>{percentLabel(credit.borrowedPercent)}</span>
          </div>
          <div>
            <span>Belum lunas akhir bulan</span>
            <strong>{money(credit.outstanding)}</strong>
            <span>{percentLabel(credit.outstandingPercent)}</span>
          </div>
        </div>
        <p className="muted small">
          Lunas bulan ini: {money(credit.paid)}. Sisa belum lunas mencakup
          kredit bulan sebelumnya; status mengikuti pembayaran sampai akhir
          bulan pilihan.
        </p>
        {credit.income === 0 && (
          <p className="muted small">
            Persentase belum dapat dihitung karena pemasukan bulan ini nol.
          </p>
        )}
        <h3>Grafik kredit 6 bulan</h3>
        <div className="chart-legend">
          <span>
            <i className="expense-dot" /> Kredit baru
          </span>
          <span>
            <i className="income-dot" /> Lunas
          </span>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label="Grafik kredit baru dan pelunasan selama enam bulan; angka lengkap tersedia di bawah"
        >
          {periods.map((p) => (
            <div className="bar-column" key={p.key}>
              <div className="bars">
                <div
                  className="bar expense-bar"
                  style={{
                    height: `${(p.credit.borrowed / creditMax) * 100}%`,
                  }}
                  title={`Kredit baru ${money(p.credit.borrowed)}`}
                />
                <div
                  className="bar income-bar"
                  style={{ height: `${(p.credit.paid / creditMax) * 100}%` }}
                  title={`Lunas ${money(p.credit.paid)}`}
                />
              </div>
              <span>{monthLabel(p.key).split(" ")[0].slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <details className="chart-table">
          <summary>Lihat angka kredit lengkap</summary>
          <table>
            <caption>Kredit enam bulan</caption>
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Kredit baru</th>
                <th>Lunas</th>
                <th>Belum lunas</th>
                <th>Kredit baru / pemasukan</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.key}>
                  <td>{monthLabel(p.key)}</td>
                  <td>{money(p.credit.borrowed)}</td>
                  <td>{money(p.credit.paid)}</td>
                  <td>{money(p.credit.outstanding)}</td>
                  <td>{percentLabel(p.credit.borrowedPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <div className="chart-table">
          {credit.categories.length ? (
            <table>
              <caption>Kategori kredit · {monthLabel(month)}</caption>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Kredit baru</th>
                  <th>Lunas bulan ini</th>
                  <th>Belum lunas</th>
                </tr>
              </thead>
              <tbody>
                {credit.categories.map((c) => (
                  <tr key={normalize(c.name)}>
                    <th scope="row">{c.name}</th>
                    <td>{money(c.borrowed)}</td>
                    <td>{money(c.paid)}</td>
                    <td>{money(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted small">Belum ada kredit pada periode ini.</p>
          )}
        </div>
      </section>
      <section className="panel chart-panel">
        <h2>Sebaran pengeluaran</h2>
        <p className="muted small">
          {monthLabel(month)} · total {money(total)}
        </p>
        {categories.length ? (
          categories.map((c) => (
            <div className="category-breakdown" key={c.name}>
              <div>
                <span>
                  <CategoryIcon name={c.name} size={17} />
                  {c.name}
                </span>
                <strong>
                  {money(c.amount)}{" "}
                  <small>{Math.round((c.amount / total) * 100)}%</small>
                </strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${(c.amount / total) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <ChartNoAxesCombined size={30} />
            <p>Grafik akan terisi setelah kamu mencatat pengeluaran.</p>
          </div>
        )}
      </section>
    </>
  );
}
