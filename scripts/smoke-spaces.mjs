// Uses an existing test account. Deletes only rooms created by this run.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd(), true);
const sql = neon(process.env.DATABASE_URL);
const origin = process.env.TEST_APP_ORIGIN || "http://localhost:3000";
if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD)
  throw new Error(
    "Set TEST_EMAIL and TEST_PASSWORD for an existing test account.",
  );
const client = await request.newContext({
  baseURL: origin,
  extraHTTPHeaders: { origin },
});
const rooms = [];
let browser;
async function post(path, data) {
  const r = await client.post(path, { data });
  assert.equal(r.status(), 200, `${path}: ${r.status()}`);
  return r.json();
}
try {
  await post("/api/auth/sign-in/email", {
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });
  const session = await (
    await client.get("/api/auth/get-session?disableCookieCache=true")
  ).json();
  const before = await (await client.get("/api/finance")).json();
  const room = await post("/api/spaces", {
    action: "create",
    name: "Uji ruang sementara",
    kind: "couple",
  });
  rooms.push(room.id);
  const url = `/api/spaces/${room.id}/finance`;
  const entry = {
    id: randomUUID(),
    type: "contribution",
    amount: 100000,
    category: "Kas",
    note: "Uji kontribusi",
    date: "2026-10-01",
    active: true,
  };
  await post(url, { action: "entry", entry });
  await post(url, {
    action: "entry",
    entry: {
      ...entry,
      id: randomUUID(),
      type: "out",
      amount: 30000,
      category: "Belanja",
      note: "Uji belanja",
    },
  });
  await post(url, {
    action: "budget",
    budget: {
      id: randomUUID(),
      month: "2026-10",
      name: "Belanja",
      planned: 20000,
    },
  });
  const result = await (await client.get(url)).json();
  assert.equal(result.finance.entries.length, 2);
  assert.equal(result.details.events.length, 3);
  const personal = await (await client.get("/api/finance")).json();
  assert.deepEqual(
    {
      ...personal,
      entries: personal.entries.filter((e) => e.spaceId !== room.id),
    },
    before,
  );
  assert.equal(
    personal.entries.find((e) => e.id === `shared:${entry.id}`).amount,
    100000,
  );
  // Editing/retrying is a single source of truth, never a duplicate personal debit.
  await post(url, { action: "entry", entry: { ...entry, amount: 1000 } });
  await post(url, { action: "entry", entry: { ...entry, amount: 1000 } });
  let synced = await (await client.get("/api/finance")).json();
  assert.equal(synced.entries.filter((e) => e.spaceId === room.id).length, 1);
  assert.equal(synced.entries.find((e) => e.spaceId === room.id).amount, 1000);
  const partnerId = randomUUID();
  await sql`INSERT INTO dompetku.shared_entries(id,space_id,user_id,author_name,type,amount,category,note,date) VALUES(${partnerId},${room.id},'test-partner','Pasangan tes','contribution',2000,'Kas','','2026-10-01')`;
  synced = await (await client.get("/api/finance")).json();
  assert.equal(synced.entries.filter((e) => e.spaceId === room.id).length, 1);
  assert.equal(
    (
      await client.post(url, {
        data: { action: "delete", kind: "entry", id: partnerId },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await client.post(url, {
        data: {
          action: "entry",
          entry: { ...entry, id: partnerId, amount: 9999 },
        },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await client.post("/api/finance", {
        data: { action: "delete", kind: "entry", id: `shared:${entry.id}` },
      })
    ).status(),
    400,
  );
  await post(url, { action: "delete", kind: "entry", id: entry.id });
  assert.deepEqual(await (await client.get("/api/finance")).json(), before);
  await post(url, { action: "entry", entry });
  const invite = await post("/api/spaces", {
    action: "invite",
    spaceId: room.id,
    email: "wrong-recipient@example.com",
  });
  assert.equal(
    (
      await client.post("/api/spaces", {
        data: { action: "accept", invitationId: invite.id },
      })
    ).status(),
    403,
  );
  await post("/api/spaces", {
    action: "revoke",
    spaceId: room.id,
    invitationId: invite.id,
  });
  const foreignId = randomUUID();
  rooms.push(foreignId);
  await sql`INSERT INTO dompetku.spaces(id,name,kind,owner_id) VALUES(${foreignId},'Fixture akses','family','test-fixture-owner')`;
  assert.equal(
    (await client.get(`/api/spaces/${foreignId}/finance`)).status(),
    403,
  );
  await sql`INSERT INTO dompetku.space_members(space_id,user_id,name,email) VALUES(${foreignId},${session.user.id},'Test',${session.user.email})`;
  const foreignUrl = `/api/spaces/${foreignId}/finance`;
  assert.equal((await client.get(foreignUrl)).status(), 200);
  assert.equal(
    (
      await client.post(foreignUrl, {
        data: {
          action: "budget",
          budget: {
            id: randomUUID(),
            month: "2026-10",
            name: "Forbidden",
            planned: 1,
          },
        },
      })
    ).status(),
    403,
  );
  await sql`DELETE FROM dompetku.space_members WHERE space_id=${foreignId} AND user_id=${session.user.id}`;
  assert.equal((await client.get(foreignUrl)).status(), 403);
  assert.equal(
    (
      await client.post(foreignUrl, {
        data: { action: "entry", entry: { ...entry, id: randomUUID() } },
      })
    ).status(),
    403,
  );
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    storageState: await client.storageState(),
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Ruang Bersama", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Uji ruang sementara Pasangan" })
    .click();
  await page
    .getByText("Melebihi Rp")
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(async () => {
      assert.match(
        await page.locator(".shared-budget").innerText(),
        /Melebihi/,
      );
    });
  await page.locator(".shared-budget summary").click();
  assert.match(await page.locator(".shared-budget").innerText(), /Uji belanja/);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/shared-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "artifacts/shared-desktop.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.equal(
    (
      await client.post("/api/spaces", {
        data: {
          action: "deleteSpace",
          spaceId: foreignId,
          confirmation: "Fixture akses",
        },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await client.post("/api/spaces", {
        data: {
          action: "deleteSpace",
          spaceId: room.id,
          confirmation: "Nama salah",
        },
      })
    ).status(),
    403,
  );
  await page
    .getByRole("button", { name: "Hapus ruang ini", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Hapus ruang permanen", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page
    .getByRole("button", { name: "Hapus ruang ini", exact: true })
    .click();
  await page.getByLabel("Konfirmasi nama ruang").fill("Uji ruang sementara");
  await page
    .getByRole("button", { name: "Hapus ruang permanen", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Ruang Bersama", exact: true })
    .waitFor();
  assert.equal((await client.get(url)).status(), 403);
  const [remaining] =
    await sql`SELECT (SELECT count(*) FROM dompetku.shared_entries WHERE space_id=${room.id}) + (SELECT count(*) FROM dompetku.shared_budgets WHERE space_id=${room.id}) + (SELECT count(*) FROM dompetku.space_members WHERE space_id=${room.id}) + (SELECT count(*) FROM dompetku.space_invites WHERE space_id=${room.id}) + (SELECT count(*) FROM dompetku.space_events WHERE space_id=${room.id}) AS count`;
  assert.equal(Number(remaining.count), 0);
  assert.deepEqual(await (await client.get("/api/finance")).json(), before);
  console.log(
    "PASS: shared CRUD, personal isolation, owner permissions, revoked access, mobile/desktop UI, delete confirmation, cascade cleanup and personal data preserved.",
  );
} finally {
  if (browser) await browser.close();
  for (const id of rooms) await sql`DELETE FROM dompetku.spaces WHERE id=${id}`;
  await client.post("/api/auth/sign-out", { data: {} });
  await client.dispose();
}
