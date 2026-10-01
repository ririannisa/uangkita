import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryNameSchema, categoryOptions } from "../lib/categories";
import {
  backupSchema,
  entrySchema,
  figures,
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
