import { z } from "zod";

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
export const entrySchema = z.object({
  id: z.uuid(),
  type: z.enum(["in", "out", "deposit", "withdraw", "fixed"]),
  amount,
  category: z.string().trim().min(1).max(80),
  note: z.string().trim().max(300),
  date: dateSchema,
  active: z.boolean().default(true),
});
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
  entries: Entry[];
  budgets: Budget[];
  plans: Plan[];
};
export const emptyData: FinanceData = { entries: [], budgets: [], plans: [] };
export const backupSchema = z
  .object({
    version: z.literal(1),
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
    ]) {
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({
          code: "custom",
          message: "Cadangan mengandung data duplikat",
        });
    }
  });
export const mutationSchema = z.discriminatedUnion("action", [
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
    saved,
    savings,
    transferred,
    balance: income - expense - saved - transferred,
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
