import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import templates from "../lib/event-plan-templates.json";
import {
  planActionSchema,
  planFieldsSchema,
  planSummary,
  type PlanItem,
} from "../lib/event-plans";

test("templates start unready, have no inherited budgets, and use actual item counts", () => {
  for (const [kind, count] of [
    ["lamaran", 27],
    ["wedding", 55],
  ] as const) {
    const items: PlanItem[] = templates[kind].map((i) => ({
      ...i,
      id: randomUUID(),
    }));
    const plan = { name: "Acara", date: null, location: "", items };
    assert.ok(planFieldsSchema.safeParse(plan).success);
    assert.deepEqual(planSummary(items), {
      total: count,
      ready: 0,
      percent: 0,
      estimated: 0,
      unpriced: count,
    });
    items[0] = { ...items[0], ready: true, estimated: 150000 };
    items[1] = { ...items[1], estimated: 0 };
    const summary = planSummary(items);
    assert.equal(summary.ready, 1);
    assert.equal(summary.estimated, 150000);
    assert.equal(summary.unpriced, count - 2);
    const reduced = planSummary(items.filter((i) => i.id !== items[0].id));
    assert.equal(reduced.total, count - 1);
    assert.equal(reduced.ready, 0);
    assert.equal(reduced.estimated, 0);
  }
});
test("plan mutations reject identity overrides, duplicate ids, impossible dates, and invalid money", () => {
  const item = { ...templates.lamaran[0], id: randomUUID() };
  const plan = {
    name: "Acara",
    date: "2026-10-07",
    location: "Rumah",
    items: [item],
  };
  assert.ok(planFieldsSchema.safeParse(plan).success);
  for (const invalid of [
    { ...plan, date: "2026-02-30" },
    { ...plan, items: [item, item] },
    { ...plan, items: [{ ...item, estimated: -1 }] },
    { ...plan, items: [{ ...item, estimated: 0.5 }] },
    {
      ...plan,
      items: Array.from({ length: 201 }, () => ({ ...item, id: randomUUID() })),
    },
  ])
    assert.equal(planFieldsSchema.safeParse(invalid).success, false);
  const save = { action: "save", id: randomUUID(), revision: 0, plan };
  assert.ok(planActionSchema.safeParse(save).success);
  assert.equal(
    planActionSchema.safeParse({ ...save, userId: randomUUID() }).success,
    false,
  );
  assert.equal(
    planActionSchema.safeParse({ ...save, revision: -1 }).success,
    false,
  );
});
