import { test, expect } from "@playwright/test";

test("budget includes savings allocation without deducting deposits twice", async ({
  page,
}, info) => {
  await page.goto("/demo");
  const nav = page.locator(
    info.project.name === "mobile" ? ".bottom-nav" : ".desktop-sidebar",
  );
  await nav.getByRole("button", { name: "Anggaran", exact: true }).click();
  const summary = page.locator(".budget-summary");
  const value = (label: string) =>
    summary
      .locator("div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("strong");
  await expect(value("Total rencana")).toHaveText("Rp 3.100.000");
  await expect(value("Sudah terealisasi")).toHaveText("Rp 3.815.000");
  await expect(value("Sisa setelah rencana")).toHaveText("Rp 6.650.000");
  await expect(value("Sisa uang saat ini")).toHaveText("Rp 4.435.000");

  const goal = page.locator(".savings-goal");
  await goal.getByRole("button", { name: "Buat target tabungan" }).click();
  const month = await goal.getByLabel("Bulan mulai").inputValue();
  await goal.getByLabel("Nama target").fill("Dana darurat");
  await goal.getByLabel("Nominal target (Rp)").fill("3000000");
  await goal.getByRole("button", { name: "Simpan target" }).click();
  await expect(value("Total rencana")).toHaveText("Rp 6.100.000");
  await expect(value("Sisa setelah rencana")).toHaveText("Rp 3.650.000");
  await expect(value("Sisa uang saat ini")).toHaveText("Rp 4.435.000");
  await expect(value("Sisa alokasi")).toHaveText("Rp 2.285.000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await goal.getByRole("button", { name: "Ubah target tabungan" }).click();
  await goal.getByLabel("Nominal target (Rp)").fill("20000000");
  await goal.getByRole("button", { name: "Simpan target" }).click();
  await expect(value("Sisa setelah rencana")).toHaveText("-Rp 13.350.000");
  await expect(value("Sisa setelah rencana")).toHaveClass("negative");

  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(value("Total rencana")).toHaveText("Rp 0");
  await expect(value("Sisa uang saat ini")).toHaveText("Rp 0");
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await goal.getByRole("button", { name: "Ubah target tabungan" }).click();
  await expect(goal.getByLabel("Bulan mulai")).toHaveValue(month);
  page.once("dialog", (dialog) => dialog.accept());
  await goal.getByRole("button", { name: "Hapus target", exact: true }).click();
  await expect(value("Total rencana")).toHaveText("Rp 3.100.000");
  await expect(value("Sisa uang saat ini")).toHaveText("Rp 4.435.000");
});

test("recurring fixed expense, partial payments, and savings plan", async ({
  page,
}, info) => {
  await page.goto("/demo");
  const nav = page.locator(
    info.project.name === "mobile" ? ".bottom-nav" : ".desktop-sidebar",
  );
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Pengeluaran tetap", exact: true })
    .click();
  const bills = page.locator(".recurring-bills");
  await bills
    .getByRole("button", { name: "Tambah langganan / tagihan" })
    .click();
  await bills.getByLabel("Nama langganan / tagihan").fill("Claude");
  await bills.getByLabel("Nominal bulanan (Rp)").fill("300000");
  await bills.getByLabel("Tanggal tagihan tiap bulan").fill("1");
  await bills.getByRole("button", { name: "Simpan tagihan berulang" }).click();
  await nav.getByRole("button", { name: "Beranda", exact: true }).click();
  const overview = page.locator(".bill-overview");
  await expect(overview).toContainText("300.000");
  await expect(overview).toContainText("4.135.000");
  await overview.locator("summary").click();
  await overview.getByRole("button", { name: "Catat bulan ini" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Catat transaksi", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Hapus transaksi" }),
  ).toHaveCount(0);
  await dialog.getByLabel("Pembayaran", { exact: true }).selectOption("credit");
  await dialog.getByLabel("Jatuh tempo", { exact: true }).fill("2026-10-05");
  await dialog
    .getByLabel("Status kredit", { exact: true })
    .selectOption("partial");
  await dialog
    .getByLabel("Tanggal pembayaran 1", { exact: true })
    .fill("2026-10-02");
  await dialog
    .getByLabel("Nominal pembayaran 1", { exact: true })
    .fill("100000");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(overview).toContainText("200.000");
  await expect(overview).toContainText("4.135.000");
  await overview.getByRole("button", { name: "Catat pembayaran" }).click();
  await dialog
    .getByLabel("Status kredit", { exact: true })
    .selectOption("paid");
  await expect(
    dialog.getByLabel("Nominal pembayaran 2", { exact: true }),
  ).toHaveValue("200000");
  await dialog
    .getByLabel("Tanggal pembayaran 2", { exact: true })
    .fill("2026-11-05");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".balance-amount")).toContainText("200.000");
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await expect(page.locator(".balance-amount")).toContainText("4.335.000");
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Pengeluaran tetap", exact: true })
    .click();
  await expect(
    bills.getByRole("button", { name: "Sudah tercatat" }),
  ).toBeDisabled();
  await nav.getByRole("button", { name: "Beranda", exact: true }).click();
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Tabungan", exact: true })
    .click();
  const goal = page.locator(".savings-goal");
  await goal.getByRole("button", { name: "Buat target tabungan" }).click();
  await goal.getByLabel("Nama target").fill("Dana darurat");
  await goal.getByLabel("Nominal target (Rp)").fill("3000000");
  await goal.getByLabel("Bulan mulai").fill("2026-10");
  await goal.getByLabel("Bulan target").fill("2026-12");
  await goal.getByRole("button", { name: "Simpan target" }).click();
  await expect(goal).toContainText("1.000.000");
  await expect(goal).toContainText("Lebih Rp 500.000");
  await expect(goal.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-savings-plan.png`,
    fullPage: true,
  });
});
