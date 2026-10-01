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
  });
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
