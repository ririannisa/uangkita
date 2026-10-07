import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { accountDeletionSchema } from "../lib/account-deletion";
import { sqlStatements } from "../scripts/sql-statements.mjs";

test("account deletion requires explicit shared-data consent and rejects target account overrides", () => {
  const request = { confirmation: "HAPUS AKUN", acknowledgeSharedData: true };
  assert.ok(accountDeletionSchema.safeParse(request).success);
  for (const invalid of [
    { ...request, confirmation: "HAPUS" },
    { ...request, acknowledgeSharedData: false },
    { ...request, userId: "someone-else" },
      { ...request, password: "unused" },
  ])
    assert.equal(accountDeletionSchema.safeParse(invalid).success, false);
});

test("migration preserves atomic cleanup function instead of splitting its internal SQL", () => {
  const source = readFileSync(
    new URL("../db/007_account_deletion.sql", import.meta.url),
    "utf8",
  );
  const statements = sqlStatements(source);
  assert.equal(statements.length, 3);
  assert.match(statements[0], /IF EXISTS[\s\S]*RAISE EXCEPTION/);
  assert.match(
    statements[0],
    /DELETE FROM dompetku.recurring_bills[\s\S]*END;/,
  );
  assert.doesNotMatch(statements[0], /DELETE FROM dompetku.spaces/);
  assert.match(statements[1], /REVOKE ALL/);
  assert.match(statements[2], /AFTER DELETE ON neon_auth\."user"/);
});
