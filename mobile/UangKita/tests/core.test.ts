import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mobileAuthRedirect,
  mobileAuthVerifier,
} from "../../../lib/mobile-auth";
import {
  applyMutation,
  demoData,
  sessionCookie,
  sessionCookieName,
  shiftMonth,
} from "../src/lib/core";
import {
  backupSchema,
  figures,
  mutationSchema,
  realization,
  savingsProgress,
} from "../src/lib/finance";

test("native session stores only the Neon token, handles combined expiry headers and revocation", () => {
  const token = `${sessionCookieName}=signed-token`;
  assert.equal(
    sessionCookie([
      `tracking=never-store; Path=/, ${token}; Expires=Wed, 21 Oct 2037 07:28:00 GMT; HttpOnly, __Secure-neon-auth.local.session_data=cache`,
    ]),
    token,
  );
  assert.equal(sessionCookie(["unrelated=value"], token), token);
  assert.equal(sessionCookie([`${token}; Max-Age=0`], token), "");
  assert.equal(
    sessionCookie([`${token}; Expires=Wed, 21 Oct 2020 07:28:00 GMT`], token),
    "",
  );
  assert.equal(sessionCookie([`${sessionCookieName}=; Path=/`], token), "");
});

test("Google callback is fixed to the app, bound to its attempt, and never contains a session token", () => {
  const state = "01234567-0123-4123-8123-0123456789ab";
  const input = new URL(
    `https://uangkita.aksenraras.my.id/api/mobile-auth/callback?state=${state}&neon_auth_session_verifier=one-use-verifier&redirect=https://evil.example&session_token=secret`,
  );
  const callback = mobileAuthRedirect(input)!;
  assert.equal(mobileAuthVerifier(callback, state), "one-use-verifier");
  assert.equal(callback.includes("secret"), false);
  assert.equal(callback.includes("evil.example"), false);
  assert.throws(
    () => mobileAuthVerifier(callback, "another-attempt"),
    /tidak cocok/,
  );
  assert.throws(
    () => mobileAuthVerifier(callback.replace("uangkita:", "https:"), state),
    /tidak cocok/,
  );
  assert.equal(
    mobileAuthRedirect(new URL("https://example.com/?state=invalid")),
    null,
  );
  input.searchParams.set("error", "denied");
  assert.throws(
    () => mobileAuthVerifier(mobileAuthRedirect(input)!, state),
    /belum berhasil/,
  );
  const challenge = "__Secure-neon-auth.session_challenge=private-challenge";
  assert.equal(sessionCookie([`${challenge}; HttpOnly`]), "");
  assert.equal(
    sessionCookie(
      [`${challenge}; HttpOnly`],
      "",
      Date.now(),
      "__Secure-neon-auth.session_challenge",
    ),
    challenge,
  );
  assert.equal(
    sessionCookie(
      [`${challenge}; Max-Age=0`],
      challenge,
      Date.now(),
      "__Secure-neon-auth.session_challenge",
    ),
    "",
  );
});

test("mobile uses the exact web figures, savings plan and validated mutations", () => {
  const data = demoData("2026-10");
  assert.equal(backupSchema.safeParse({ ...data, version: 1 }).success, true);
  assert.equal(figures(data, "2026-10").balance, 4435000);
  const planned = applyMutation(
    data,
    mutationSchema.parse({
      action: "savingsGoal",
      goal: {
        name: "Dana darurat",
        amount: 3000000,
        startMonth: "2026-10",
        targetMonth: "2026-12",
      },
    }),
  );
  assert.equal(savingsProgress(planned, "2026-10")!.monthlyPlan, 1000000);
  assert.equal(figures(planned, "2026-10").balance, 4435000);
  const withdrawn = applyMutation(
    planned,
    mutationSchema.parse({
      action: "entry",
      entry: {
        id: "00000000-0000-4000-8000-000000000099",
        type: "withdraw",
        amount: 200000,
        category: "Tabungan",
        note: "",
        date: "2026-10-04",
        active: true,
      },
    }),
  );
  assert.equal(figures(withdrawn, "2026-10").balance, 4635000);
  assert.equal(savingsProgress(withdrawn, "2026-10")!.monthlyActual, 1300000);
  assert.equal(realization(withdrawn, data.budgets[0]).spent, 1680000);
  assert.throws(
    () =>
      applyMutation(data, {
        action: "entry",
        entry: { ...withdrawn.entries.at(-1)!, amount: 2000000 },
      }),
    /melebihi total tabungan/,
  );
  const recurringId = "00000000-0000-4000-8000-000000000080";
  const bill = { ...data.entries[5], recurringId };
  assert.throws(
    () =>
      applyMutation(
        { ...data, entries: [...data.entries, bill] },
        {
          action: "entry",
          entry: { ...bill, id: "00000000-0000-4000-8000-000000000081" },
        },
      ),
    /sudah tercatat/,
  );
  assert.throws(
    () =>
      applyMutation(data, {
        action: "budget",
        budget: {
          ...data.budgets[0],
          id: "00000000-0000-4000-8000-000000000098",
          name: " makan & MINUM ",
        },
      }),
    /sudah memiliki/,
  );
  assert.equal(
    mutationSchema.safeParse({
      action: "entry",
      entry: { ...data.entries[0], amount: -10 },
    }).success,
    false,
  );
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
