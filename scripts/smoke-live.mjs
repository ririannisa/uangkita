// Explicit live test: creates ONE test account, then removes its temporary finance rows.
// Run only against the intended environment. Credentials are printed once at the end.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { request } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

nextEnv.loadEnvConfig(process.cwd(), true);
const origin = process.env.TEST_APP_ORIGIN || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL);
const credentials = {
  email: `tes.dompetku.${Date.now()}@example.com`,
  password: `Dk!${randomBytes(18).toString("base64url")}`,
};
const account = {
  name: "Akun Tes Dompetku",
  ...credentials,
  callbackURL: `${origin}/`,
};
const checks = [];
let userId;
const entryId = randomUUID();
const budgetId = randomUUID();
const client = await request.newContext({
  baseURL: origin,
  extraHTTPHeaders: { origin },
});
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const month = date.slice(0, 7);
let failure;

async function post(path, data) {
  const response = await client.post(path, { data });
  if (!response.ok()) {
    const body = await response.json().catch(() => ({}));
    // Never include request credentials or connection strings in errors.
    throw new Error(`${path}: HTTP ${response.status()} ${body.code || ""}`);
  }
  return response.json();
}

try {
  assert.equal((await sql.query("SELECT 1 AS ok"))[0].ok, 1);
  checks.push("Neon SQL connection");
  const registered = await post("/api/auth/sign-up/email", account);
  assert.ok(registered.user?.id, "Registration must return user id");
  userId = registered.user.id;
  checks.push("Email/password registration");
  await post("/api/auth/sign-out", {});
  await post("/api/auth/sign-in/email", credentials);
  const sessionResponse = await client.get(
    "/api/auth/get-session?disableCookieCache=true",
  );
  const session = await sessionResponse.json();
  assert.equal(session?.user?.id, userId);
  checks.push("Password login and session");
  const rows = await sql.query(
    'SELECT id FROM neon_auth."user" WHERE id::text = $1 AND email = $2',
    [userId, credentials.email],
  );
  assert.equal(rows.length, 1);
  checks.push("Auth account persisted in same Neon database");

  await post("/api/finance", {
    action: "budget",
    budget: { id: budgetId, month, name: "Uji koneksi", planned: 100000 },
  });
  const entry = {
    id: entryId,
    type: "out",
    amount: 25000,
    category: "Uji koneksi",
    note: "Transaksi sementara smoke test",
    date,
    active: true,
  };
  await post("/api/finance", { action: "entry", entry });
  let finance = await (await client.get("/api/finance")).json();
  assert.equal(finance.entries.find((e) => e.id === entryId)?.amount, 25000);
  assert.equal(finance.budgets.find((b) => b.id === budgetId)?.planned, 100000);
  checks.push("Authenticated budget/transaction create and read");

  await post("/api/finance", {
    action: "entry",
    entry: { ...entry, amount: 30000 },
  });
  const persisted = await sql.query(
    "SELECT amount::int AS amount FROM dompetku.entries WHERE id = $1 AND user_id = $2",
    [entryId, userId],
  );
  assert.equal(persisted[0].amount, 30000);
  checks.push("Transaction update persisted in Neon");
  await post("/api/finance", { action: "delete", kind: "entry", id: entryId });
  await post("/api/finance", {
    action: "delete",
    kind: "budget",
    id: budgetId,
  });
  finance = await (await client.get("/api/finance")).json();
  assert.ok(!finance.entries.some((e) => e.id === entryId));
  assert.ok(!finance.budgets.some((b) => b.id === budgetId));
  checks.push("Delete temporary test rows");
  await post("/api/auth/sign-out", {});
  assert.equal((await client.get("/api/finance")).status(), 401);
  checks.push("Logout revokes access to financial data");
} catch (error) {
  failure = error instanceof Error ? error.message : "Live test failed";
} finally {
  if (userId) {
    // Exact test UUIDs and test user only; never touch another account's data.
    await sql
      .transaction([
        sql.query(
          "DELETE FROM dompetku.entries WHERE id = $1 AND user_id = $2",
          [entryId, userId],
        ),
        sql.query(
          "DELETE FROM dompetku.budgets WHERE id = $1 AND user_id = $2",
          [budgetId, userId],
        ),
      ])
      .catch(() => {
        failure = `${failure || ""} Temporary-row cleanup failed; inspect test IDs.`;
      });
  }
  await client.dispose();
}
console.log(
  JSON.stringify({
    success: !failure,
    checks,
    failure,
    account: userId ? { ...credentials, userId } : null,
  }),
);
if (failure) process.exitCode = 1;
