// Uses an existing test account, restores its goal, and deletes only this run's records.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { request } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd(), true);
assert.ok(
  process.env.TEST_EMAIL && process.env.TEST_PASSWORD,
  "Existing test credentials required",
);
const sql = neon(process.env.DATABASE_URL);
const origin = process.env.TEST_APP_ORIGIN || "http://localhost:3000";
const client = await request.newContext({
  baseURL: origin,
  extraHTTPHeaders: { origin },
});
const bill = {
  id: randomUUID(),
  name: "Uji langganan sementara",
  amount: 300000,
  category: "Langganan",
  day: 31,
  startMonth: "2026-10",
  active: true,
};
const entry = {
  id: randomUUID(),
  type: "fixed",
  amount: bill.amount,
  category: bill.category,
  note: bill.name,
  date: "2026-10-01",
  active: true,
  paymentMethod: "credit",
  dueDate: "2026-11-01",
  recurringId: bill.id,
  creditPayments: [{ id: randomUUID(), date: "2026-10-02", amount: 100000 }],
};
const goal = {
  name: "Uji target sementara",
  amount: 3000000,
  startMonth: "2026-10",
  targetMonth: "2026-12",
};
let owner;
let previousSettings;
let roomId;
async function post(path, data) {
  const response = await client.post(path, { data });
  assert.equal(response.status(), 200, `${path}: ${response.status()}`);
  return response.json();
}
try {
  await post("/api/auth/sign-in/email", {
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });
  const session = await (
    await client.get("/api/auth/get-session?disableCookieCache=true")
  ).json();
  owner = session.user.id;
  previousSettings =
    await sql`SELECT savings_goal FROM dompetku.finance_settings WHERE user_id=${owner}`;
  await post("/api/finance", { action: "recurringBill", bill });
  await post("/api/finance", { action: "savingsGoal", goal });
  await post("/api/finance", { action: "entry", entry });
  const readResponse = await client.get("/api/finance");
  assert.equal(readResponse.status(), 200);
  const data = await readResponse.json();
  assert.deepEqual(data.savingsGoal, goal);
  assert.deepEqual(
    data.recurringBills.find((b) => b.id === bill.id),
    bill,
  );
  assert.deepEqual(
    data.entries.find((e) => e.id === entry.id).creditPayments,
    entry.creditPayments,
  );
  assert.equal(
    data.entries.find((e) => e.id === entry.id).recurringId,
    bill.id,
  );
  const duplicate = await client.post("/api/finance", {
    data: { action: "entry", entry: { ...entry, id: randomUUID() } },
  });
  assert.equal(duplicate.status(), 409);
  const invalid = await client.post("/api/finance", {
    data: {
      action: "entry",
      entry: {
        ...entry,
        creditPayments: [{ ...entry.creditPayments[0], amount: 400000 }],
      },
    },
  });
  assert.equal(invalid.status(), 400);
  const foreign = await client.post("/api/finance", {
    data: { action: "entry", entry: { ...entry, recurringId: randomUUID() } },
  });
  assert.equal(foreign.status(), 400);
  roomId = (
    await post("/api/spaces", {
      action: "create",
      name: "Uji pembayaran sementara",
      kind: "couple",
    })
  ).id;
  const sharedEntry = {
    ...entry,
    id: randomUUID(),
    type: "out",
    recurringId: null,
  };
  const sharedUrl = `/api/spaces/${roomId}/finance`;
  await post(sharedUrl, { action: "entry", entry: sharedEntry });
  const sharedResponse = await client.get(sharedUrl);
  assert.equal(sharedResponse.status(), 200);
  const shared = await sharedResponse.json();
  assert.deepEqual(
    shared.finance.entries.find((e) => e.id === sharedEntry.id).creditPayments,
    sharedEntry.creditPayments,
  );
  console.log(
    "Live API: goal, recurring template, personal/shared partial payments, duplicate and invalid payment guards passed.",
  );
} finally {
  if (owner) {
    const cleanup = [
      sql`DELETE FROM dompetku.entries WHERE user_id=${owner} AND recurring_id=${bill.id}`,
      sql`DELETE FROM dompetku.recurring_bills WHERE user_id=${owner} AND id=${bill.id}`,
    ];
    if (previousSettings?.length)
      cleanup.push(
        sql`UPDATE dompetku.finance_settings SET savings_goal=${JSON.stringify(previousSettings[0].savings_goal)}::jsonb WHERE user_id=${owner}`,
      );
    else if (previousSettings)
      cleanup.push(
        sql`DELETE FROM dompetku.finance_settings WHERE user_id=${owner}`,
      );
    if (roomId)
      cleanup.push(
        sql`DELETE FROM dompetku.spaces WHERE id=${roomId} AND owner_id=${owner}`,
      );
    await sql.transaction(cleanup);
  }
  await client.dispose();
}
