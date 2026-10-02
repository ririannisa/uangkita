import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryNameSchema, categoryOptions } from "../lib/categories";
import {
  backupSchema,
  entrySchema,
  figures,
  creditFigures,
  inActivityMonth,
  realization,
  type FinanceData,
} from "../lib/finance";

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
