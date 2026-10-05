import { figures, normalize, type FinanceData, type Mutation } from "./finance";

export const sessionCookieName = "__Secure-neon-auth.session_token";

// Set-Cookie may be combined; Expires contains a comma that is not a separator.
export function sessionCookie(
  headers: string[],
  previous = "",
  now = Date.now(),
  name = sessionCookieName,
) {
  let cookie = previous;
  for (const header of headers) {
    for (const part of header.split(/,(?=\s*[^;,=\s]+=)/)) {
      const [pair, ...attributes] = part.trim().split(";");
      if (!pair.startsWith(`${name}=`)) continue;
      const maxAge = attributes.find((a) => /^\s*max-age=/i.test(a));
      const expires = attributes.find((a) => /^\s*expires=/i.test(a));
      const expired = maxAge
        ? Number(maxAge.split("=")[1]) <= 0
        : expires && Date.parse(expires.slice(expires.indexOf("=") + 1)) <= now;
      cookie = expired || pair === `${name}=` ? "" : pair;
    }
  }
  return cookie;
}

export function applyMutation(data: FinanceData, a: Mutation): FinanceData {
  switch (a.action) {
    case "entry": {
      if (data.entries.some((e) => e.id === a.entry.id && e.spaceId))
        throw new Error("Transfer ruang bersama hanya dapat dibaca.");
      if (
        a.entry.recurringId &&
        data.entries.some(
          (e) =>
            e.id !== a.entry.id &&
            e.recurringId === a.entry.recurringId &&
            e.date.slice(0, 7) === a.entry.date.slice(0, 7),
        )
      )
        throw new Error(
          "Tagihan berulang tersebut sudah tercatat pada bulan ini.",
        );
      const next = {
        ...data,
        entries: [...data.entries.filter((e) => e.id !== a.entry.id), a.entry],
      };
      if (
        a.entry.type === "withdraw" &&
        a.entry.active &&
        figures(next, a.entry.date.slice(0, 7)).savings < 0
      )
        throw new Error("Nominal penarikan melebihi total tabungan.");
      return next;
    }
    case "budget":
      if (
        data.budgets.some(
          (b) =>
            b.id !== a.budget.id &&
            b.month === a.budget.month &&
            normalize(b.name) === normalize(a.budget.name),
        )
      )
        throw new Error("Kategori sudah memiliki anggaran pada bulan ini.");
      return {
        ...data,
        budgets: [
          ...data.budgets.filter((b) => b.id !== a.budget.id),
          a.budget,
        ],
      };
    case "income":
      return {
        ...data,
        plans: [...data.plans.filter((p) => p.month !== a.plan.month), a.plan],
      };
    case "savingsGoal":
      return { ...data, savingsGoal: a.goal };
    case "recurringBill":
      return {
        ...data,
        recurringBills: [
          ...(data.recurringBills ?? []).filter((b) => b.id !== a.bill.id),
          a.bill,
        ],
      };
    case "category":
      return {
        ...data,
        categories: [...new Set([...(data.categories ?? []), a.name])],
      };
    case "delete":
      return {
        ...data,
        entries:
          a.kind === "entry"
            ? data.entries.filter((e) => e.id !== a.id)
            : data.entries,
        budgets:
          a.kind === "budget"
            ? data.budgets.filter((b) => b.id !== a.id)
            : data.budgets,
      };
    case "import":
      return a.backup;
    case "reset":
      return { entries: [], budgets: [], plans: [] };
  }
}

export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function demoData(month: string): FinanceData {
  return {
    plans: [{ month, income: 8500000 }],
    budgets: ["Makan & minum", "Transportasi", "Belanja"].map((name, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i + 1}`,
      month,
      name,
      planned: [1500000, 600000, 1000000][i],
    })),
    entries: [
      ["out", 875000, "Makan & minum", "Belanja kebutuhan dapur", "01"],
      ["out", 425000, "Makan & minum", "Makan malam keluarga", "02"],
      ["out", 380000, "Makan & minum", "Kopi & makan siang", "03"],
      ["out", 185000, "Transportasi", "Isi bensin", "02"],
      ["out", 450000, "Belanja", "Sepatu kerja", "03"],
      ["fixed", 1500000, "Tempat tinggal", "Sewa kos bulanan", "01"],
      ["deposit", 1500000, "Tabungan", "Dana darurat", "01"],
      ["in", 1250000, "Freelance", "Proyek desain", "04"],
    ].map(([type, amount, category, note, day], i) => ({
      id: `00000000-0000-4000-8000-00000000001${i + 1}`,
      type: type as FinanceData["entries"][number]["type"],
      amount: Number(amount),
      category: String(category),
      note: String(note),
      date: `${month}-${day}`,
      active: true,
    })),
  };
}
