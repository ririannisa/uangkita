import { z } from "zod";
import { categoryActionSchema, categoryNameSchema, categoryOptions, existingCategory } from "./categories";

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
  creditPayments: z
    .array(z.object({ id: z.uuid(), date: dateSchema, amount }))
    .max(1000)
    .optional(),
  recurringId: z.uuid().nullable().optional(),
});
export function validPayment(entry: {
  type: string;
  date: string;
  paymentMethod?: string;
  dueDate?: string | null;
  paidDate?: string | null;
  amount?: number;
  creditPayments?: { id: string; date: string; amount: number }[];
  recurringId?: string | null;
}) {
  const payments = entry.creditPayments ?? [];
  if (entry.recurringId && entry.type !== "fixed") return false;
  if (
    payments.length &&
    (entry.paidDate ||
      payments.some((p) => p.date < entry.date) ||
      new Set(payments.map((p) => p.id)).size !== payments.length ||
      payments.reduce((sum, p) => sum + p.amount, 0) > (entry.amount ?? 0))
  )
    return false;
  return entry.paymentMethod === "credit"
    ? (entry.type === "out" || entry.type === "fixed") &&
        !!entry.dueDate &&
        entry.dueDate >= entry.date &&
        (!entry.paidDate || entry.paidDate >= entry.date)
    : !entry.dueDate && !entry.paidDate && !payments.length;
}
export const paymentValidation = {
  message:
    "Periksa pembayaran: kredit wajib memiliki jatuh tempo, tanggal pembayaran tidak boleh sebelum transaksi, dan total pembayaran tidak boleh melebihi tagihan.",
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
export const savingsGoalSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    amount,
    startMonth: monthSchema,
    targetMonth: monthSchema,
  })
  .refine(
    (g) => g.targetMonth >= g.startMonth,
    "Bulan target tidak boleh sebelum bulan mulai",
  );
export const recurringBillSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  amount,
  category: z.string().trim().min(1).max(80),
  day: z.number().int().min(1).max(31),
  startMonth: monthSchema,
  active: z.boolean(),
});
export type SavingsGoal = z.infer<typeof savingsGoalSchema>;
export type RecurringBill = z.infer<typeof recurringBillSchema>;
export type CreditPayment = NonNullable<
  z.infer<typeof entryBaseSchema>["creditPayments"]
>[number];
// Linked transfers are read-only projections of shared contributions, not personal writes.
export type Entry = z.infer<typeof entrySchema> & { spaceId?: string };
export type DailyFoodAllowance = {
  days: number;
  daily: number;
  cashLimited: boolean;
  includesToday: boolean;
};
export type Budget = z.infer<typeof budgetSchema> & {
  dailyFoodAllowance?: DailyFoodAllowance | null;
};
export type Plan = z.infer<typeof planSchema>;
export type FinanceData = {
  availableCategories?: string[];
  activityCategories?: string[];
  categories?: string[];
  entries: Entry[];
  budgets: Budget[];
  plans: Plan[];
  savingsGoal?: SavingsGoal | null;
  recurringBills?: RecurringBill[];
};
export const emptyData: FinanceData = { entries: [], budgets: [], plans: [] };
export const backupSchema = z
  .object({
    version: z.literal(1),
    categories: z.array(categoryNameSchema).max(2000).default([]),
    entries: z.array(entrySchema).max(10000),
    budgets: z.array(budgetSchema).max(2000),
    plans: z.array(planSchema).max(1212),
    savingsGoal: savingsGoalSchema.nullable().optional(),
    recurringBills: z.array(recurringBillSchema).max(500).default([]),
  })
  .superRefine((data, ctx) => {
    for (const keys of [
      data.entries.map((x) => x.id),
      data.budgets.map((x) => x.id),
      data.budgets.map((x) => `${x.month}:${normalize(x.name)}`),
      data.plans.map((x) => x.month),
      data.categories.map(normalize),
      data.recurringBills.map((b) => b.id),
      data.entries
        .filter((e) => e.recurringId)
        .map((e) => `${e.recurringId}:${e.date.slice(0, 7)}`),
    ]) {
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({
          code: "custom",
          message: "Cadangan mengandung data duplikat",
        });
    }
    if (
      data.entries.some(
        (e) =>
          e.recurringId &&
          !data.recurringBills.some((b) => b.id === e.recurringId),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Template tagihan pada cadangan tidak ditemukan",
      });
  });
export const mutationSchema = z.discriminatedUnion("action", [
  categoryActionSchema,
  z.object({ action: z.literal("entry"), entry: entrySchema }),
  z.object({ action: z.literal("budget"), budget: budgetSchema }),
  z.object({ action: z.literal("income"), plan: planSchema }),
  z.object({
    action: z.literal("savingsGoal"),
    goal: savingsGoalSchema.nullable(),
  }),
  z.object({ action: z.literal("recurringBill"), bill: recurringBillSchema }),
  z.object({
    action: z.literal("delete"),
    kind: z.enum(["entry", "budget"]),
    id: z.uuid(),
  }),
  z.object({ action: z.literal("import"), backup: backupSchema }),
  z.object({ action: z.literal("reset"), confirmation: z.literal("HAPUS") }),
]);
export type Mutation = z.infer<typeof mutationSchema>;

export function canonicalMutation(action: Mutation, names: string[]): Mutation {
  if (action.action === "entry")
    return { ...action, entry: { ...action.entry, category: existingCategory(action.entry.category, names) } };
  if (action.action === "budget")
    return { ...action, budget: { ...action.budget, name: existingCategory(action.budget.name, names) } };
  if (action.action === "recurringBill")
    return { ...action, bill: { ...action.bill, category: existingCategory(action.bill.category, names) } };
  if (action.action === "category")
    return { ...action, name: existingCategory(action.name, names) };
  return action;
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
        throw Object.assign(new Error(
          "Tagihan berulang tersebut sudah tercatat pada bulan ini.",
        ), { status: 409 });
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
        throw Object.assign(new Error("Kategori sudah memiliki anggaran pada bulan ini."), { status: 409 });
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

type Payable = {
  date: string;
  amount: number;
  paymentMethod?: string;
  paidDate?: string | null;
  creditPayments?: CreditPayment[];
};
export function paymentsOf(entry: Payable): { date: string; amount: number }[] {
  return entry.paymentMethod !== "credit"
    ? [{ date: entry.date, amount: entry.amount }]
    : entry.creditPayments?.length
      ? entry.creditPayments
      : entry.paidDate
        ? [{ date: entry.paidDate, amount: entry.amount }]
        : [];
}
export function remainingCredit(entry: Payable, through = "2100-12-31") {
  return Math.max(
    0,
    entry.amount -
      paymentsOf(entry)
        .filter((p) => p.date <= through)
        .reduce((sum, p) => sum + p.amount, 0),
  );
}
export function creditStatus(entry: Payable) {
  const remaining = remainingCredit(entry);
  return remaining === 0
    ? "Lunas"
    : remaining < entry.amount
      ? "Dibayar sebagian"
      : "Belum lunas";
}

export function inActivityMonth(
  entry: {
    date: string;
    paymentMethod?: string;
    paidDate?: string | null;
    active: boolean;
    amount: number;
    creditPayments?: CreditPayment[];
  },
  month: string,
) {
  return (
    entry.date.startsWith(month) ||
    !!entry.paidDate?.startsWith(month) ||
    !!entry.creditPayments?.some((p) => p.date.startsWith(month)) ||
    (entry.active &&
      entry.paymentMethod === "credit" &&
      remainingCredit(entry, `${month}-31`) > 0 &&
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
      (e) => e.active && !e.spaceId && (e.type === "out" || e.type === "fixed"),
    )
    .reduce(
      (sum, e) =>
        sum +
        paymentsOf(e)
          .filter((p) => p.date.startsWith(month))
          .reduce((paid, p) => paid + p.amount, 0),
      0,
    );
  const saved = sum("deposit") - sum("withdraw");
  const savings = data.entries.reduce(
    (s, e) =>
      s +
      (e.active
        ? e.type === "deposit"
          ? e.amount
          : e.type === "withdraw"
            ? -e.amount
            : 0
        : 0),
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
    const paid = paymentsOf(e)
      .filter((p) => p.date.startsWith(month))
      .reduce((sum, p) => sum + p.amount, 0);
    const outstanding = remainingCredit(e, `${month}-31`);
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

export function dailyFoodAllowance(
  data: FinanceData,
  budget: Budget,
  asOf = today(),
): DailyFoodAllowance | null {
  const name = normalize(budget.name)
    .replace(/\s*&\s*/g, " dan ")
    .replace(/\s+/g, " ");
  if (name !== "makan dan minum" || budget.month < asOf.slice(0, 7)) return null;
  const [year, month] = budget.month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const includesToday = budget.month === asOf.slice(0, 7);
  const days = includesToday ? lastDay - Number(asOf.slice(8, 10)) + 1 : lastDay;
  const remaining = Math.max(0, realization(data, budget).remaining);
  const balance = Math.max(0, figures(data, budget.month).balance);
  return {
    days,
    daily: Math.floor(Math.min(remaining, balance) / days),
    cashLimited: balance < remaining,
    includesToday,
  };
}

export function withFinanceDetails(data: FinanceData, asOf = today()): FinanceData {
  return {
    ...data,
    availableCategories: categoryOptions(data),
    activityCategories: categoryOptions(data, true),
    budgets: data.budgets.map((budget) => ({
      ...budget,
      dailyFoodAllowance: dailyFoodAllowance(data, budget, asOf),
    })),
  };
}

const monthNumber = (month: string) =>
  Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
export function savingsProgress(data: FinanceData, month: string) {
  const goal = data.savingsGoal;
  if (!goal) return null;
  const net = (entries: Entry[]) =>
    entries
      .filter((e) => e.active)
      .reduce(
        (sum, e) =>
          sum +
          (e.type === "deposit"
            ? e.amount
            : e.type === "withdraw"
              ? -e.amount
              : 0),
        0,
      );
  const baseline = net(
    data.entries.filter((e) => e.date.slice(0, 7) < goal.startMonth),
  );
  const actual = net(data.entries.filter((e) => e.date.slice(0, 7) <= month));
  const months =
    monthNumber(goal.targetMonth) - monthNumber(goal.startMonth) + 1;
  const monthlyPlan = Math.ceil(Math.max(0, goal.amount - baseline) / months);
  const elapsed = Math.max(
    0,
    Math.min(months, monthNumber(month) - monthNumber(goal.startMonth) + 1),
  );
  const planned = Math.min(goal.amount, baseline + monthlyPlan * elapsed);
  const monthlyActual = net(
    data.entries.filter((e) => e.date.startsWith(month)),
  );
  const remaining = Math.max(0, goal.amount - actual);
  const nextMonths = Math.max(
    0,
    monthNumber(goal.targetMonth) -
      Math.max(monthNumber(month), monthNumber(goal.startMonth) - 1),
  );
  return {
    baseline,
    actual,
    monthlyPlan,
    monthlyActual,
    monthlyGap:
      monthlyActual -
      (month >= goal.startMonth && month <= goal.targetMonth ? monthlyPlan : 0),
    planned,
    gap: actual - planned,
    remaining,
    nextMonthly: nextMonths > 0 ? Math.ceil(remaining / nextMonths) : null,
    percent: Math.max(
      0,
      Math.min(100, Math.round((actual / goal.amount) * 100)),
    ),
  };
}
export function recurringDate(bill: RecurringBill, month: string) {
  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  return `${month}-${String(Math.min(bill.day, lastDay)).padStart(2, "0")}`;
}
export function billOverview(data: FinanceData, month: string, asOf = today()) {
  const cutoff = `${month}-31`;
  const candidates = data.entries.filter(
    (e) =>
      e.active &&
      !e.spaceId &&
      e.paymentMethod === "credit" &&
      e.date <= cutoff,
  );
  const credits = candidates
    .map((entry) => ({ entry, remaining: remainingCredit(entry, cutoff) }))
    .filter((b) => b.remaining > 0)
    .sort((a, b) =>
      (a.entry.dueDate ?? "").localeCompare(b.entry.dueDate ?? ""),
    );
  const pendingRecurring = (data.recurringBills ?? []).filter(
    (b) =>
      b.active &&
      b.startMonth <= month &&
      !data.entries.some(
        (e) => e.recurringId === b.id && e.date.startsWith(month),
      ),
  );
  const unpaid = credits
    .filter((b) => b.entry.dueDate && b.entry.dueDate <= cutoff)
    .reduce((sum, b) => sum + b.remaining, 0);
  const recurring = pendingRecurring.reduce((sum, b) => sum + b.amount, 0);
  const soon = new Date(`${asOf}T12:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 7);
  const soonDate = soon.toISOString().slice(0, 10);
  const reminders = candidates.filter(
    (e) =>
      e.date <= asOf &&
      e.dueDate &&
      e.dueDate <= soonDate &&
      remainingCredit(e, asOf) > 0,
  );
  return {
    credits,
    pendingRecurring,
    unpaid,
    recurring,
    afterBills: figures(data, month).balance - unpaid - recurring,
    reminders,
  };
}

export function creditHealth(data: FinanceData, month: string, asOf = today()) {
  const income = figures(data, month).income;
  const bills = billOverview(data, month, asOf);
  const paid = creditFigures(data, month, income).paid;
  // ponytail: full remaining balance is due; use scheduled installments when that data exists.
  const burden = paid + bills.unpaid;
  const limit = Math.floor(income * 0.3);
  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const reference = [`${month}-${lastDay}`, asOf].sort()[0];
  const overdue = data.entries
    .filter(
      (e) =>
        e.active &&
        !e.spaceId &&
        e.paymentMethod === "credit" &&
        e.date <= reference &&
        e.dueDate &&
        e.dueDate < reference,
    )
    .reduce((sum, e) => sum + remainingCredit(e, reference), 0);
  const excess = Math.max(0, burden - limit);
  const status =
    income <= 0
      ? "Belum dapat dinilai"
      : excess > 0 || bills.afterBills < 0
        ? "Beban tinggi"
        : overdue > 0
          ? "Perlu perhatian"
          : "Dalam acuan";
  const reasons: string[] = [];
  if (income <= 0)
    reasons.push(
      "Catat pemasukan bulan ini agar rasio dan kemampuan pembayaran dapat dinilai.",
    );
  else if (excess > 0)
    reasons.push(
      `Beban pembayaran melewati acuan 30% sebesar ${money(excess)}. Kurangi komitmen kredit baru; kewajiban yang sudah ada tetap perlu diselesaikan.`,
    );
  else
    reasons.push(
      "Beban pembayaran tidak melebihi acuan 30% dari pemasukan tercatat.",
    );
  if (bills.afterBills < 0)
    reasons.push(
      `Perkiraan saldo setelah tagihan minus ${money(-bills.afterBills)}. Tinjau pengeluaran dan siapkan dana untuk kewajiban yang jatuh tempo.`,
    );
  if (overdue > 0)
    reasons.push(
      `Ada sisa kredit terlambat ${money(overdue)} per ${reference.split("-").reverse().join("/")}. Prioritaskan penyelesaiannya.`,
    );
  if (status === "Dalam acuan")
    reasons.push(
      "Tidak ada tunggakan dan perkiraan saldo setelah tagihan tidak minus. Pastikan kebutuhan yang belum dicatat tetap terdanai sebelum menambah kredit.",
    );
  return {
    status,
    income,
    paid,
    unpaid: bills.unpaid,
    burden,
    limit,
    excess,
    overdue,
    afterBills: bills.afterBills,
    reference,
    percent: income > 0 ? (burden / income) * 100 : null,
    reasons,
  };
}
