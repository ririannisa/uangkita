import { z } from "zod";
import { categoryActionSchema, categoryNameSchema } from "./categories";

export const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00+07:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
export const normalize = (name: string) =>
  name.trim().toLocaleLowerCase("id-ID");
const amount = z.number().int().min(1).max(1_000_000_000_000);
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine(
    (v) => v >= "2000-01" && v <= "2100-12",
    "Periode harus antara 2000–2100",
  );
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === v &&
      v >= "2000-01-01" &&
      v <= "2100-12-31"
    );
  }, "Tanggal tidak valid");
export const entryBaseSchema = z.object({
  id: z.uuid(),
  type: z.enum(["in", "out", "deposit", "withdraw", "fixed"]),
  amount,
  category: z.string().trim().min(1).max(80),
  note: z.string().trim().max(300),
  date: dateSchema,
  active: z.boolean().default(true),
  paymentMethod: z.enum(["direct", "credit"]).optional(),
  dueDate: dateSchema.nullable().optional(),
  paidDate: dateSchema.nullable().optional(),
});
export function validPayment(entry: {
  type: string;
  date: string;
  paymentMethod?: string;
  dueDate?: string | null;
  paidDate?: string | null;
}) {
  return entry.paymentMethod === "credit"
    ? (entry.type === "out" || entry.type === "fixed") &&
        !!entry.dueDate &&
        entry.dueDate >= entry.date &&
        (!entry.paidDate || entry.paidDate >= entry.date)
    : !entry.dueDate && !entry.paidDate;
}
export const paymentValidation = {
  message:
    "Kredit hanya untuk pengeluaran; jatuh tempo wajib diisi. Jatuh tempo dan tanggal pembayaran tidak boleh sebelum tanggal transaksi.",
  path: ["dueDate"],
};
export const entrySchema = entryBaseSchema.refine(
  validPayment,
  paymentValidation,
);
export const budgetSchema = z.object({
  id: z.uuid(),
  month: monthSchema,
  name: z.string().trim().min(1).max(80),
  planned: amount,
});
export const planSchema = z.object({
  month: monthSchema,
  income: amount.min(0),
});
// Linked transfers are read-only projections of shared contributions, not personal writes.
export type Entry = z.infer<typeof entrySchema> & { spaceId?: string };
export type Budget = z.infer<typeof budgetSchema>;
export type Plan = z.infer<typeof planSchema>;
export type FinanceData = {
  categories?: string[];
  entries: Entry[];
  budgets: Budget[];
  plans: Plan[];
};
export const emptyData: FinanceData = { entries: [], budgets: [], plans: [] };
export const backupSchema = z
  .object({
    version: z.literal(1),
    categories: z.array(categoryNameSchema).max(2000).default([]),
    entries: z.array(entrySchema).max(10000),
    budgets: z.array(budgetSchema).max(2000),
    plans: z.array(planSchema).max(1212),
  })
  .superRefine((data, ctx) => {
    for (const keys of [
      data.entries.map((x) => x.id),
      data.budgets.map((x) => x.id),
      data.budgets.map((x) => `${x.month}:${normalize(x.name)}`),
      data.plans.map((x) => x.month),
      data.categories.map(normalize),
    ]) {
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({
          code: "custom",
          message: "Cadangan mengandung data duplikat",
        });
    }
  });
export const mutationSchema = z.discriminatedUnion("action", [
  categoryActionSchema,
  z.object({ action: z.literal("entry"), entry: entrySchema }),
  z.object({ action: z.literal("budget"), budget: budgetSchema }),
  z.object({ action: z.literal("income"), plan: planSchema }),
  z.object({
    action: z.literal("delete"),
    kind: z.enum(["entry", "budget"]),
    id: z.uuid(),
  }),
  z.object({ action: z.literal("import"), backup: backupSchema }),
  z.object({ action: z.literal("reset"), confirmation: z.literal("HAPUS") }),
]);
export type Mutation = z.infer<typeof mutationSchema>;

// A missing paidDate means the credit has not been settled.
export function paymentDate(entry: {
  date: string;
  paymentMethod?: string;
  paidDate?: string | null;
}) {
  return entry.paymentMethod === "credit" ? entry.paidDate : entry.date;
}
export function inActivityMonth(
  entry: {
    date: string;
    paymentMethod?: string;
    paidDate?: string | null;
    active: boolean;
  },
  month: string,
) {
  return (
    entry.date.startsWith(month) ||
    !!entry.paidDate?.startsWith(month) ||
    (entry.active &&
      entry.paymentMethod === "credit" &&
      !entry.paidDate &&
      entry.date.slice(0, 7) <= month)
  );
}

export function figures(data: FinanceData, month: string) {
  const entries = data.entries.filter(
    (e) => e.date.startsWith(month) && e.active,
  );
  const sum = (type: Entry["type"]) =>
    entries
      .filter((e) => e.type === type && !e.spaceId)
      .reduce((s, e) => s + e.amount, 0);
  const income =
    (data.plans.find((p) => p.month === month)?.income ?? 0) + sum("in");
  const expense = sum("out") + sum("fixed");
  const cashExpense = data.entries
    .filter(
      (e) =>
        e.active &&
        !e.spaceId &&
        (e.type === "out" || e.type === "fixed") &&
        paymentDate(e)?.startsWith(month),
    )
    .reduce((sum, e) => sum + e.amount, 0);
  const saved = sum("deposit") - sum("withdraw");
  const savings = data.entries.reduce(
    (s, e) =>
      s +
      (e.type === "deposit" ? e.amount : e.type === "withdraw" ? -e.amount : 0),
    0,
  );
  const transferred = entries
    .filter((e) => e.spaceId)
    .reduce((s, e) => s + e.amount, 0);
  return {
    income,
    expense,
    cashExpense,
    saved,
    savings,
    transferred,
    balance: income - cashExpense - saved - transferred,
  };
}

export function creditFigures(
  data: FinanceData,
  month: string,
  income = figures(data, month).income,
) {
  const categories = new Map<
    string,
    { name: string; borrowed: number; paid: number; outstanding: number }
  >();
  for (const e of data.entries) {
    if (
      !e.active ||
      e.spaceId ||
      e.paymentMethod !== "credit" ||
      (e.type !== "out" && e.type !== "fixed") ||
      e.date.slice(0, 7) > month
    )
      continue;
    const borrowed = e.date.startsWith(month) ? e.amount : 0;
    const paid = e.paidDate?.startsWith(month) ? e.amount : 0;
    const outstanding =
      !e.paidDate || e.paidDate.slice(0, 7) > month ? e.amount : 0;
    if (!borrowed && !paid && !outstanding) continue;
    const key = normalize(e.category);
    const c = categories.get(key) ?? {
      name: e.category.trim(),
      borrowed: 0,
      paid: 0,
      outstanding: 0,
    };
    c.borrowed += borrowed;
    c.paid += paid;
    c.outstanding += outstanding;
    categories.set(key, c);
  }
  const rows = [...categories.values()].sort(
    (a, b) =>
      b.outstanding - a.outstanding ||
      b.borrowed - a.borrowed ||
      b.paid - a.paid,
  );
  const borrowed = rows.reduce((sum, c) => sum + c.borrowed, 0);
  const paid = rows.reduce((sum, c) => sum + c.paid, 0);
  const outstanding = rows.reduce((sum, c) => sum + c.outstanding, 0);
  const percent = (amount: number) =>
    income > 0 ? Math.round((amount / income) * 1000) / 10 : null;
  return {
    income,
    borrowed,
    paid,
    outstanding,
    borrowedPercent: percent(borrowed),
    outstandingPercent: percent(outstanding),
    categories: rows,
  };
}

export function realization(data: FinanceData, budget: Budget) {
  const transactions = data.entries
    .filter(
      (e) =>
        (e.type === "out" || e.type === "fixed") &&
        !e.spaceId &&
        e.active &&
        e.date.startsWith(budget.month) &&
        normalize(e.category) === normalize(budget.name),
    )
    .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  const spent = transactions.reduce((s, e) => s + e.amount, 0);
  return {
    transactions,
    spent,
    remaining: budget.planned - spent,
    percent: Math.round((spent / budget.planned) * 100),
  };
}
