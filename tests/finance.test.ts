import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryNameSchema, categoryOptions } from "../lib/categories";
import {
  backupSchema,
  entrySchema,
  figures,
  creditFigures,
  creditHealth,
  billOverview,
  savingsProgress,
  recurringDate,
  remainingCredit,
  creditStatus,
  mutationSchema,
  inActivityMonth,
  realization,
  type FinanceData,
} from "../lib/finance";

test("credit health assesses monthly obligations, overdue dates, and cash without double counting", () => {
  const credit = {
    id: crypto.randomUUID(),
    type: "out" as const,
    amount: 3500000,
    category: "Belanja",
    note: "Kredit",
    date: "2026-09-01",
    active: true,
    paymentMethod: "credit" as const,
    dueDate: "2026-10-05",
    creditPayments: [
      { id: crypto.randomUUID(), date: "2026-10-02", amount: 1000000 },
    ],
  };
  const finance: FinanceData = {
    entries: [credit],
    budgets: [],
    plans: [{ month: "2026-10", income: 10000000 }],
  };
  const result = creditHealth(finance, "2026-10", "2026-10-02");
  assert.equal(result.burden, 3500000);
  assert.equal(result.percent, 35);
  assert.equal(result.excess, 500000);
  assert.equal(result.afterBills, 6500000);
  assert.equal(result.status, "Beban tinggi");
  assert.equal(result.overdue, 0);
  assert.ok(result.reasons.some((r) => r.includes("500.000")));
  const atLimit = { ...finance, entries: [{ ...credit, amount: 3000000 }] };
  assert.equal(
    creditHealth(atLimit, "2026-10", "2026-10-02").status,
    "Dalam acuan",
  );
  assert.equal(
    creditHealth(
      { ...finance, entries: [{ ...credit, amount: 3000001 }] },
      "2026-10",
      "2026-10-02",
    ).status,
    "Beban tinggi",
  );
  const late = creditHealth(atLimit, "2026-10", "2026-10-06");
  assert.equal(late.status, "Perlu perhatian");
  assert.equal(late.overdue, 2000000);
  const deficit = creditHealth(
    {
      ...atLimit,
      entries: [
        ...atLimit.entries,
        {
          ...credit,
          id: crypto.randomUUID(),
          paymentMethod: "direct",
          dueDate: null,
          creditPayments: [],
          amount: 8000000,
          date: "2026-10-01",
        },
      ],
    },
    "2026-10",
    "2026-10-02",
  );
  assert.equal(deficit.status, "Beban tinggi");
  assert.equal(deficit.percent, 30);
  assert.equal(deficit.afterBills, -1000000);
  const noIncome = creditHealth(
    { ...finance, plans: [] },
    "2026-10",
    "2026-10-02",
  );
  assert.equal(noIncome.status, "Belum dapat dinilai");
  assert.equal(noIncome.percent, null);
  const nextMonthDue = {
    ...finance,
    entries: [{ ...credit, dueDate: "2026-11-05" }],
  };
  assert.equal(
    creditHealth(nextMonthDue, "2026-10", "2026-10-02").burden,
    1000000,
  );
  const paidLate = {
    ...atLimit,
    entries: [
      {
        ...credit,
        amount: 3000000,
        creditPayments: [
          ...credit.creditPayments,
          { id: crypto.randomUUID(), date: "2026-10-10", amount: 2000000 },
        ],
      },
    ],
  };
  assert.equal(
    creditHealth(paidLate, "2026-10", "2026-10-06").overdue,
    2000000,
  );
  assert.equal(creditHealth(paidLate, "2026-10", "2026-10-10").overdue, 0);
  assert.equal(creditHealth(paidLate, "2026-10", "2026-10-10").burden, 3000000);
  const excluded = {
    ...finance,
    entries: [
      { ...credit, active: false },
      { ...credit, id: "shared:transfer", spaceId: "room" },
    ],
  };
  assert.equal(creditHealth(excluded, "2026-10", "2026-10-02").burden, 0);
  assert.equal(creditHealth(finance, "2026-09", "2026-10-02").overdue, 0);
});

const data: FinanceData = {
  plans: [
    { month: "2026-10", income: 1000000 },
    { month: "2026-09", income: 500000 },
  ],
  budgets: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Makan",
      month: "2026-10",
      planned: 200000,
    },
  ],
  entries: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "out",
      amount: 250000,
      category: " makan ",
      note: "Terbesar",
      date: "2026-10-01",
      active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      type: "fixed",
      amount: 50000,
      category: "Makan",
      note: "Langganan",
      date: "2026-10-02",
      active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      type: "out",
      amount: 900000,
      category: "Makan",
      note: "Bulan lalu",
      date: "2026-09-01",
      active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000005",
      type: "deposit",
      amount: 100000,
      category: "Tabungan",
      note: "",
      date: "2026-10-01",
      active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000006",
      type: "withdraw",
      amount: 25000,
      category: "Tabungan",
      note: "",
      date: "2026-10-02",
      active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000007",
      type: "fixed",
      amount: 100000,
      category: "Makan",
      note: "Nonaktif",
      date: "2026-10-01",
      active: false,
    },
  ],
};
test("partial payments reduce cash only on their own dates and reject invalid totals", () => {
  const credit = {
    ...data.entries[0],
    amount: 1000000,
    paymentMethod: "credit" as const,
    dueDate: "2026-11-01",
    creditPayments: [
      { id: crypto.randomUUID(), date: "2026-10-02", amount: 200000 },
      { id: crypto.randomUUID(), date: "2026-11-01", amount: 300000 },
    ],
  };
  const updated = {
    entries: [credit],
    budgets: data.budgets,
    plans: data.plans,
  };
  assert.equal(entrySchema.safeParse(credit).success, true);
  assert.equal(figures(updated, "2026-10").cashExpense, 200000);
  assert.equal(figures(updated, "2026-10").balance, 800000);
  assert.equal(figures(updated, "2026-11").cashExpense, 300000);
  assert.equal(creditFigures(updated, "2026-10").outstanding, 800000);
  assert.equal(creditFigures(updated, "2026-11").outstanding, 500000);
  assert.equal(remainingCredit(credit), 500000);
  assert.equal(creditStatus(credit), "Dibayar sebagian");
  assert.equal(inActivityMonth(credit, "2026-12"), true);
  const full = {
    ...credit,
    creditPayments: [
      ...credit.creditPayments,
      { id: crypto.randomUUID(), date: "2026-12-01", amount: 500000 },
    ],
  };
  assert.equal(creditStatus(full), "Lunas");
  assert.equal(inActivityMonth(full, "2027-01"), false);
  assert.equal(
    entrySchema.safeParse({ ...full, amount: 999999 }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...credit, paidDate: "2026-10-02" }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      ...credit,
      creditPayments: [{ ...credit.creditPayments[0], date: "2026-09-30" }],
    }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      ...credit,
      creditPayments: [credit.creditPayments[0], credit.creditPayments[0]],
    }).success,
    false,
  );
  assert.equal(
    backupSchema.parse({ version: 1, ...updated }).entries[0].creditPayments
      ?.length,
    2,
  );
  assert.equal(
    figures(
      {
        ...updated,
        entries: [{ ...credit, creditPayments: [credit.creditPayments[0]] }],
      },
      "2026-11",
    ).cashExpense,
    0,
  );
});
test("savings goals compare monthly net realization, cumulative plan, and revised forecast", () => {
  const base = {
    ...data.entries[0],
    type: "deposit" as const,
    category: "Tabungan",
  };
  const updated: FinanceData = {
    budgets: [],
    plans: [],
    savingsGoal: {
      name: "Dana darurat",
      amount: 1200000,
      startMonth: "2026-10",
      targetMonth: "2026-12",
    },
    entries: [
      { ...base, id: "prior", date: "2026-09-01", amount: 300000 },
      { ...base, id: "now", amount: 200000 },
      { ...base, id: "withdraw", type: "withdraw", amount: 50000 },
      { ...base, id: "future", date: "2026-11-01", amount: 400000 },
    ],
  };
  const goal = savingsProgress(updated, "2026-10")!;
  assert.equal(goal.baseline, 300000);
  assert.equal(goal.monthlyPlan, 300000);
  assert.equal(goal.monthlyActual, 150000);
  assert.equal(goal.monthlyGap, -150000);
  assert.equal(goal.actual, 450000);
  assert.equal(goal.planned, 600000);
  assert.equal(goal.nextMonthly, 375000);
  assert.equal(savingsProgress(updated, "2026-11")!.monthlyGap, 100000);
  assert.equal(savingsProgress(updated, "2026-12")!.nextMonthly, null);
  assert.equal(
    mutationSchema.safeParse({
      action: "savingsGoal",
      goal: { ...updated.savingsGoal, targetMonth: "2026-09" },
    }).success,
    false,
  );
  assert.equal(
    savingsProgress({ ...updated, savingsGoal: null }, "2026-10"),
    null,
  );
});
test("bill forecasts include unpaid due credit and unrecorded subscriptions without double counting", () => {
  const bill = {
    id: crypto.randomUUID(),
    name: "Claude",
    amount: 300000,
    category: "Langganan",
    day: 31,
    startMonth: "2026-10",
    active: true,
  };
  const credit = {
    ...data.entries[0],
    amount: 500000,
    paymentMethod: "credit" as const,
    dueDate: "2026-10-05",
    creditPayments: [
      { id: crypto.randomUUID(), date: "2026-10-02", amount: 100000 },
    ],
  };
  const future = {
    ...credit,
    id: crypto.randomUUID(),
    dueDate: "2026-11-05",
    creditPayments: [],
  };
  const updated: FinanceData = {
    entries: [credit, future],
    budgets: [],
    plans: data.plans,
    recurringBills: [bill],
  };
  const overview = billOverview(updated, "2026-10", "2026-10-02");
  assert.equal(overview.unpaid, 400000);
  assert.equal(overview.recurring, 300000);
  assert.equal(overview.afterBills, 200000);
  assert.equal(overview.reminders.length, 1);
  const scheduled = {
    ...updated,
    entries: [
      {
        ...credit,
        creditPayments: [
          { id: crypto.randomUUID(), date: "2026-10-05", amount: 500000 },
        ],
      },
    ],
  };
  assert.equal(
    billOverview(scheduled, "2026-10", "2026-10-02").reminders.length,
    1,
  );
  assert.equal(
    billOverview(scheduled, "2026-10", "2026-10-05").reminders.length,
    0,
  );
  assert.equal(recurringDate(bill, "2027-02"), "2027-02-28");
  assert.equal(recurringDate(bill, "2028-02"), "2028-02-29");
  const recorded = {
    ...credit,
    id: crypto.randomUUID(),
    type: "fixed" as const,
    amount: 300000,
    category: "Langganan",
    recurringId: bill.id,
    paymentMethod: "direct" as const,
    dueDate: null,
    creditPayments: [],
  };
  const next = billOverview(
    { ...updated, entries: [...updated.entries, recorded] },
    "2026-10",
    "2026-10-02",
  );
  assert.equal(next.recurring, 0);
  assert.equal(next.afterBills, overview.afterBills);
  assert.equal(
    backupSchema.safeParse({
      version: 1,
      ...updated,
      entries: [recorded, { ...recorded, id: crypto.randomUUID() }],
    }).success,
    false,
  );
});
test("credit analytics separates purchases, settlements and historical debt against all monthly income", () => {
  const credit = {
    ...data.entries[0],
    paymentMethod: "credit" as const,
    dueDate: "2026-11-01",
  };
  const updated: FinanceData = {
    budgets: [],
    plans: data.plans,
    entries: [
      credit,
      {
        ...credit,
        id: "fixed",
        type: "fixed",
        category: "Transportasi",
        amount: 50000,
        paidDate: "2026-10-02",
      },
      {
        ...credit,
        id: "old-paid",
        date: "2026-09-01",
        category: "MAKAN",
        amount: 100000,
        paidDate: "2026-10-10",
      },
      {
        ...credit,
        id: "old-unpaid",
        date: "2026-09-01",
        amount: 200000,
        paidDate: "2026-11-01",
      },
      { ...credit, id: "inactive", amount: 900000, active: false },
      { ...credit, id: "transfer", amount: 900000, spaceId: "room" },
      {
        ...credit,
        id: "future",
        date: "2026-12-01",
        dueDate: "2027-01-01",
        amount: 900000,
      },
      { ...data.entries[0], id: "direct" },
      { ...data.entries[0], id: "income", type: "in", amount: 500000 },
    ],
  };
  const result = creditFigures(updated, "2026-10");
  assert.deepEqual(
    creditFigures(updated, "2026-10", figures(updated, "2026-10").income),
    result,
  );
  assert.equal(result.income, 1500000);
  assert.equal(result.borrowed, 300000);
  assert.equal(result.paid, 150000);
  assert.equal(result.outstanding, 450000);
  assert.equal(result.borrowedPercent, 20);
  assert.equal(result.outstandingPercent, 30);
  assert.deepEqual(result.categories, [
    { name: "makan", borrowed: 250000, paid: 100000, outstanding: 450000 },
    { name: "Transportasi", borrowed: 50000, paid: 50000, outstanding: 0 },
  ]);
  const next = creditFigures(updated, "2026-11");
  assert.deepEqual(creditFigures(updated, "2026-11", 0), next);
  assert.equal(next.borrowed, 0);
  assert.equal(next.paid, 200000);
  assert.equal(next.outstanding, 250000);
  assert.equal(next.borrowedPercent, null);
  assert.equal(next.outstandingPercent, null);
  assert.deepEqual(
    creditFigures({ entries: [], budgets: [], plans: [] }, "2026-10")
      .categories,
    [],
  );
  assert.equal(
    creditFigures(
      { ...data, entries: [{ ...credit, amount: 2500000 }] },
      "2026-10",
    ).borrowedPercent,
    250,
  );
});
test("credit requires a valid due date, survives backup, and preserves spending totals", () => {
  const credit = {
    ...data.entries[0],
    paymentMethod: "credit" as const,
    dueDate: "2026-11-01",
  };
  assert.equal(entrySchema.safeParse(credit).success, true);
  for (const dueDate of [null, undefined, "2026-09-30", "2026-02-30"])
    assert.equal(entrySchema.safeParse({ ...credit, dueDate }).success, false);
  assert.equal(
    entrySchema.safeParse({ ...credit, dueDate: credit.date }).success,
    true,
  );
  assert.equal(
    entrySchema.safeParse({ ...credit, type: "deposit" }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...credit, paymentMethod: "direct" }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...credit, paymentMethod: "direct", dueDate: null })
      .success,
    true,
  );
  const updated = { ...data, entries: [credit, ...data.entries.slice(1)] };
  const backup = backupSchema.parse(
    JSON.parse(JSON.stringify({ version: 1, ...updated })),
  );
  assert.equal(backup.entries[0].dueDate, credit.dueDate);
  assert.equal(backup.entries[0].paymentMethod, "credit");
  assert.equal(
    figures(updated, "2026-10").expense,
    figures(data, "2026-10").expense,
  );
  assert.equal(
    figures(updated, "2026-10").balance,
    figures(data, "2026-10").balance + credit.amount,
  );
  assert.equal(realization(updated, data.budgets[0]).spent, 300000);
});
test("credit cash follows editable settlement date across months without duplicate expenses", () => {
  const credit = {
    ...data.entries[0],
    paymentMethod: "credit" as const,
    dueDate: "2026-11-01",
    paidDate: "2026-11-05",
  };
  const updated = { ...data, entries: [credit, ...data.entries.slice(1)] };
  assert.equal(figures(updated, "2026-10").cashExpense, 50000);
  assert.equal(figures(updated, "2026-10").balance, 875000);
  assert.equal(figures(updated, "2026-11").cashExpense, 250000);
  assert.equal(figures(updated, "2026-11").balance, -250000);
  assert.equal(figures(updated, "2026-11").expense, 0);
  assert.equal(realization(updated, data.budgets[0]).spent, 300000);
  assert.equal(
    backupSchema.parse({ version: 1, ...updated }).entries[0].paidDate,
    "2026-11-05",
  );
  assert.equal(inActivityMonth(credit, "2026-11"), true);
  assert.equal(inActivityMonth({ ...credit, paidDate: null }, "2026-12"), true);
  assert.equal(
    inActivityMonth({ ...credit, paidDate: null }, "2026-09"),
    false,
  );
  const moved = {
    ...updated,
    entries: [{ ...credit, paidDate: "2026-12-01" }, ...data.entries.slice(1)],
  };
  assert.equal(figures(moved, "2026-11").cashExpense, 0);
  assert.equal(figures(moved, "2026-12").cashExpense, 250000);
  assert.equal(
    figures({ ...updated, entries: [{ ...credit, paidDate: null }] }, "2026-11")
      .cashExpense,
    0,
  );
  assert.equal(
    figures({ ...updated, entries: [{ ...credit, active: false }] }, "2026-11")
      .cashExpense,
    0,
  );
  for (const paidDate of ["2026-09-30", "2026-02-30"])
    assert.equal(entrySchema.safeParse({ ...credit, paidDate }).success, false);
  assert.equal(
    entrySchema.safeParse({ ...credit, paymentMethod: "direct", dueDate: null })
      .success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...credit, paidDate: credit.date }).success,
    true,
  );
});
test("category options merge defaults, saved names and history without case duplicates", () => {
  const names = categoryOptions({
    ...data,
    categories: ["Anak", " anak ", "Cicilan"],
  });
  assert.equal(names.filter((n) => n.toLowerCase() === "anak").length, 1);
  assert.ok(names.includes("Cicilan"));
  assert.ok(names.includes("Transportasi"));
  assert.equal(categoryNameSchema.safeParse("   ").success, false);
  assert.equal(categoryNameSchema.safeParse("a".repeat(81)).success, false);
});
test("shared transfers reduce personal balance without counting as spending or savings", () => {
  const transfer = {
    ...data.entries[0],
    id: "shared:test",
    spaceId: "room",
    amount: 1000,
  };
  const updated = { ...data, entries: [...data.entries, transfer] };
  const totals = figures(updated, "2026-10");
  assert.equal(totals.balance, figures(data, "2026-10").balance - 1000);
  assert.equal(totals.expense, figures(data, "2026-10").expense);
  assert.equal(totals.saved, figures(data, "2026-10").saved);
  assert.equal(totals.transferred, 1000);
  assert.equal(realization(updated, data.budgets[0]).spent, 300000);
  assert.equal(figures(updated, "2026-09").transferred, 0);
  assert.equal(
    figures(
      { ...data, entries: [...data.entries, { ...transfer, active: false }] },
      "2026-10",
    ).transferred,
    0,
  );
  assert.equal(entrySchema.safeParse(transfer).success, false);
});
test("realisasi menghitung kategori/periode tepat dan menempatkan transaksi terbesar di atas", () => {
  const result = realization(data, data.budgets[0]);
  assert.equal(result.spent, 300000);
  assert.equal(result.percent, 150);
  assert.equal(result.remaining, -100000);
  assert.deepEqual(
    result.transactions.map((e) => e.note),
    ["Terbesar", "Langganan"],
  );
});
test("saldo termasuk tabungan dan pengeluaran tetap aktif; periode tidak bocor", () => {
  assert.deepEqual(figures(data, "2026-10"), {
    income: 1000000,
    expense: 300000,
    cashExpense: 300000,
    saved: 75000,
    savings: 75000,
    transferred: 0,
    balance: 625000,
  });
  assert.equal(figures(data, "2026-09").income, 500000);
  assert.equal(figures(data, "2026-11").expense, 0);
  assert.equal(figures(data, "2026-11").income, 0);
});
test("validasi menolak uang negatif/tidak presisi dan tanggal mustahil", () => {
  for (const amount of [-1, 0, 1.5, Infinity, 1000000000001])
    assert.equal(
      entrySchema.safeParse({ ...data.entries[0], amount }).success,
      false,
    );
  assert.equal(
    entrySchema.safeParse({ ...data.entries[0], date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({ ...data.entries[0], date: "2028-02-29" }).success,
    true,
  );
});
test("cadangan divalidasi sebelum penggantian, termasuk kategori duplikat", () => {
  assert.equal(backupSchema.safeParse({ version: 1, ...data }).success, true);
  assert.equal(
    backupSchema.safeParse({
      version: 1,
      ...data,
      entries: [{ amount: "bad" }],
    }).success,
    false,
  );
  assert.equal(
    backupSchema.safeParse({
      version: 1,
      ...data,
      budgets: [
        ...data.budgets,
        { ...data.budgets[0], id: crypto.randomUUID(), name: " makan " },
      ],
    }).success,
    false,
  );
});
