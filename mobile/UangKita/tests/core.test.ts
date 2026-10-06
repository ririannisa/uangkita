import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleData } from "./fixtures";
import { themeColors } from "../src/lib/theme";
import { analyticsData, filterActivity } from "../src/lib/analytics";
import {
  mobileAuthRedirect,
  mobileAuthVerifier,
} from "../../../lib/mobile-auth";
import {
  applyMutation,
  sessionCookie,
  sessionCookieName,
  shiftMonth,
} from "../src/lib/core";
import {
  backupSchema,
  dailyFoodAllowance,
  figures,
  mutationSchema,
  realization,
  savingsProgress,
} from "../src/lib/finance";

test("neon remains dark on either system theme and keeps text readable", () => {
  const neon = themeColors("neon", "light");
  assert.equal(neon.dark, true);
  assert.deepEqual(themeColors("neon", "dark"), neon);
  assert.equal(themeColors("auto", "dark").dark, true);
  assert.equal(themeColors("auto", "light").dark, false);
  assert.equal(themeColors("light", "dark").dark, false);
  assert.equal(themeColors("dark", "light").dark, true);
  assert.notEqual(neon.primary, themeColors("dark", "dark").primary);
  function luminance(hex: string) {
    const channels = hex
      .slice(1)
      .match(/../g)!
      .map((channel) => {
        const value = parseInt(channel, 16) / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const background of [
    neon.bg,
    neon.surface,
    neon.mint,
    neon.lilac,
    neon.cream,
    neon.peach,
  ]) {
    for (const text of [
      neon.ink,
      neon.muted,
      neon.primary,
      neon.green,
      neon.red,
    ]) {
      assert.ok(
        (luminance(text) + 0.05) / (luminance(background) + 0.05) >= 4.5,
      );
    }
  }
});

test("analytics group real expenses, preserve totals and distinguish credit purchases from payments", () => {
  const data = sampleData("2026-10");
  const extra = {
    ...data.entries[0],
    id: "extra",
    amount: 20000,
    category: " makan & MINUM ",
  };
  const credit = {
    ...data.entries[0],
    id: "credit",
    amount: 500000,
    category: "Belanja",
    paymentMethod: "credit" as const,
    dueDate: "2026-11-10",
    creditPayments: [{ id: "payment", date: "2026-11-01", amount: 100000 }],
  };
  const reportData = {
    ...data,
    entries: [
      ...data.entries,
      extra,
      credit,
      { ...extra, id: "inactive", active: false },
      { ...extra, id: "shared", spaceId: "room" },
      ...Array.from({ length: 7 }, (_, index) => ({
        ...extra,
        id: `sector-${index}`,
        amount: 1000,
        category: `Sector ${index}`,
      })),
    ],
  };
  const report = analyticsData(reportData, "2026-10");
  assert.equal(
    report.categories.find((row) => row.name === "Makan & minum")?.amount,
    1700000,
  );
  assert.equal(report.total, figures(reportData, "2026-10").expense);
  assert.equal(
    report.slices.reduce((sum, slice) => sum + slice.amount, 0),
    report.total,
  );
  assert.equal(report.slices.length, 6);
  assert.equal(
    report.periods.at(-1)?.expense,
    figures(reportData, "2026-10").cashExpense,
  );
  assert.equal(
    analyticsData(reportData, "2026-11").periods.at(-1)?.expense,
    100000,
  );
  assert.equal(
    report.budgets.find((budget) => budget.name === "Belanja")?.spent,
    950000,
  );
  assert.deepEqual(
    filterActivity(
      reportData.entries,
      "2026-11",
      "credit",
      " belanja ",
      "",
    ).map((entry) => entry.id),
    ["credit"],
  );
  assert.equal(
    filterActivity(
      reportData.entries,
      "2026-10",
      "out",
      "Makan & minum",
      " BELANJA ",
    ).length,
    4,
  );
  const empty = analyticsData(
    { entries: [], budgets: [], plans: [] },
    "2026-10",
  );
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.slices, []);
  assert.ok(
    empty.periods.every(
      (period) => period.income === 0 && period.expense === 0,
    ),
  );
});

test("daily food allowance uses the smaller remainder, includes today and never goes negative", () => {
  const budget = { id: "food", name: "Makan & minum", month: "2026-10", planned: 780000 };
  const data = {
    entries: [],
    budgets: [budget],
    plans: [{ month: budget.month, income: 1000000 }],
  };
  assert.deepEqual(dailyFoodAllowance(data, budget, "2026-10-06"), {
    days: 26, daily: 30000, cashLimited: false, includesToday: true,
  });
  const tight = { ...data, plans: [{ month: budget.month, income: 520000 }] };
  assert.deepEqual(dailyFoodAllowance(tight, budget, "2026-10-06"), {
    days: 26, daily: 20000, cashLimited: true, includesToday: true,
  });
  const spent = { ...data, entries: [{
    id: "meal", type: "out" as const, amount: 260000,
    category: budget.name, note: "Makan", date: "2026-10-05", active: true,
  }] };
  assert.equal(dailyFoodAllowance(spent, budget, "2026-10-06")!.daily, 20000);
  assert.equal(dailyFoodAllowance(data, budget, "2026-10-31")!.daily, 780000);
  assert.equal(dailyFoodAllowance(data, budget, "2026-09-30")!.days, 31);
  assert.equal(dailyFoodAllowance(data, budget, "2026-11-01"), null);
  assert.equal(dailyFoodAllowance(data, { ...budget, name: "Transportasi" }, "2026-10-06"), null);
  assert.equal(dailyFoodAllowance(data, { ...budget, name: " Makan DAN minum " }, "2026-10-06")!.daily, 30000);
  for (const income of [0, -100000]) {
    assert.equal(dailyFoodAllowance({ ...data, plans: [{ month: budget.month, income }] }, budget, "2026-10-06")!.daily, 0);
  }
  assert.equal(dailyFoodAllowance(spent, { ...budget, planned: 100000 }, "2026-10-06")!.daily, 0);
  assert.equal(dailyFoodAllowance(data, { ...budget, planned: 780001 }, "2026-10-06")!.daily, 30000);
  for (const [month, days] of [["2028-02", 29], ["2026-02", 28]] as const) {
    assert.equal(dailyFoodAllowance(data, { ...budget, month }, `${month}-01`)!.days, days);
  }
});

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
  const data = sampleData("2026-10");
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
