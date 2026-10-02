import test from "node:test";
import assert from "node:assert/strict";
import {
  sharedFigures,
  sharedRealization,
  sharedMutationSchema,
  type SharedFinance,
} from "../lib/shared-finance";
const data: SharedFinance = {
  budgets: [],
  entries: [
    {
      id: "a",
      authorId: "one",
      authorName: "A",
      type: "contribution",
      amount: 1000,
      category: "Kas",
      date: "2026-09-01",
      note: "",
      active: true,
    },
    {
      id: "b",
      authorId: "two",
      authorName: "B",
      type: "out",
      amount: 300,
      category: "Belanja",
      date: "2026-10-01",
      note: "",
      active: true,
    },
    {
      id: "c",
      authorId: "one",
      authorName: "A",
      type: "out",
      amount: 500,
      category: " belanja ",
      date: "2026-10-02",
      note: "",
      active: true,
    },
    {
      id: "d",
      authorId: "one",
      authorName: "A",
      type: "contribution",
      amount: 2000,
      category: "Kas",
      date: "2026-11-01",
      note: "",
      active: true,
    },
  ],
};
test("shared cash carries forward but excludes future months", () => {
  assert.deepEqual(sharedFigures(data, "2026-10"), {
    balance: 200,
    contributions: 0,
    expense: 800,
    cashExpense: 800,
  });
});
test("shared credit settlement changes cash in the payment month and carries forward", () => {
  const updated: SharedFinance = {
    ...data,
    entries: data.entries.map((e) =>
      e.id === "b"
        ? {
            ...e,
            paymentMethod: "credit",
            dueDate: "2026-11-01",
            paidDate: "2026-11-05",
          }
        : e,
    ),
  };
  assert.equal(sharedFigures(updated, "2026-10").balance, 500);
  assert.equal(sharedFigures(updated, "2026-10").expense, 800);
  assert.equal(sharedFigures(updated, "2026-10").cashExpense, 500);
  assert.equal(sharedFigures(updated, "2026-11").balance, 2200);
  assert.equal(sharedFigures(updated, "2026-11").expense, 0);
  assert.equal(sharedFigures(updated, "2026-11").cashExpense, 300);
  assert.equal(sharedFigures(updated, "2026-12").balance, 2200);
  const unpaid: SharedFinance = {
    ...updated,
    entries: updated.entries.map((e) => ({ ...e, paidDate: null })),
  };
  assert.equal(sharedFigures(unpaid, "2026-11").balance, 2500);
  assert.equal(sharedFigures(unpaid, "2026-11").cashExpense, 0);
});
test("budget drilldown identifies biggest expense and contributor", () => {
  const r = sharedRealization(data, {
    id: "budget",
    month: "2026-10",
    name: "BELANJA",
    planned: 700,
  });
  assert.equal(r.spent, 800);
  assert.equal(r.entries[0].authorName, "A");
  assert.equal(r.entries[0].amount, 500);
});
test("shared mutation rejects personal operations and invalid contributions", () => {
  assert.equal(
    sharedMutationSchema.safeParse({ action: "reset", confirmation: "HAPUS" })
      .success,
    false,
  );
  assert.equal(
    sharedMutationSchema.safeParse({
      action: "entry",
      entry: { ...data.entries[0], amount: -1 },
    }).success,
    false,
  );
});
test("shared credit is allowed for expenses and rejected for contributions", () => {
  const entry = {
    ...data.entries[1],
    id: "00000000-0000-4000-8000-000000000001",
    paymentMethod: "credit",
    dueDate: "2026-11-01",
  };
  assert.equal(
    sharedMutationSchema.safeParse({ action: "entry", entry }).success,
    true,
  );
  for (const invalid of [
    { ...entry, dueDate: null },
    { ...entry, dueDate: "2026-09-30" },
    { ...entry, type: "contribution" },
  ])
    assert.equal(
      sharedMutationSchema.safeParse({ action: "entry", entry: invalid })
        .success,
      false,
    );
});
test("shared partial payments carry cash forward with the remaining credit excluded", () => {
  const updated: SharedFinance = {
    ...data,
    entries: data.entries.map((e) =>
      e.id === "b"
        ? {
            ...e,
            paymentMethod: "credit",
            dueDate: "2026-11-01",
            creditPayments: [
              { id: crypto.randomUUID(), date: "2026-10-02", amount: 100 },
              { id: crypto.randomUUID(), date: "2026-11-01", amount: 150 },
            ],
          }
        : e,
    ),
  };
  assert.equal(sharedFigures(updated, "2026-10").balance, 400);
  assert.equal(sharedFigures(updated, "2026-10").cashExpense, 600);
  assert.equal(sharedFigures(updated, "2026-11").balance, 2250);
  assert.equal(sharedFigures(updated, "2026-11").cashExpense, 150);
});
