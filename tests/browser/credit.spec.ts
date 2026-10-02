import { test, expect } from "@playwright/test";

test("credit due date is required, validated, saved, and cleared on direct payment", async ({
  page,
}, info) => {
  await page.goto("/demo");
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Catat transaksi", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nominal", { exact: true }).fill("250000");
  await dialog.getByLabel("Kategori", { exact: true }).fill("Belanja");
  await dialog
    .getByLabel("Catatan", { exact: false })
    .fill("Uji pembelian kredit");
  await dialog.getByLabel("Tanggal", { exact: true }).fill("2026-10-01");
  await dialog.getByLabel("Pembayaran", { exact: true }).selectOption("credit");
  const dueDate = dialog.getByLabel("Jatuh tempo", { exact: true });
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await dueDate.evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
  await dueDate.fill("2026-09-30");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("jatuh tempo");
  await dueDate.fill("2026-11-01");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const nav = page.locator(
    info.project.name === "mobile" ? ".bottom-nav" : ".desktop-sidebar",
  );
  async function expectBalance(text: string) {
    await nav.getByRole("button", { name: "Beranda", exact: true }).click();
    await expect(page.locator(".balance-amount")).toContainText(text);
    await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Cari transaksi" })
      .fill("Uji pembelian kredit");
  }
  await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Cari transaksi" })
    .fill("Uji pembelian kredit");
  const row = page.locator(".transaction");
  async function openAnalytics() {
    await nav.getByRole("button", { name: "Beranda", exact: true }).click();
    await page
      .locator(".quick-menu")
      .getByRole("button", { name: "Analitik", exact: true })
      .click();
  }
  async function expectCreditAnalytics(
    borrowed: string,
    outstanding: string,
    ratio: string,
  ) {
    await openAnalytics();
    const section = page.locator(".credit-analytics");
    await expect(
      section.getByRole("heading", { name: "Grafik kredit 6 bulan" }),
    ).toBeVisible();
    await expect(
      section.locator(".budget-overview > div").first(),
    ).toContainText(borrowed);
    await expect(
      section.locator(".budget-overview > div").last(),
    ).toContainText(outstanding);
    await expect(
      section.locator(".budget-overview > div").first(),
    ).toContainText(ratio);
    await expect(
      section.getByRole("rowheader", { name: "Belanja" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Cari transaksi" })
      .fill("Uji pembelian kredit");
  }
  await expect(row).toContainText("Kredit · Jatuh tempo 01/11/2026");
  await expect(row).toContainText("Belum lunas");
  await expectCreditAnalytics("250.000", "250.000", "2,6% dari pemasukan");
  // Unpaid purchases remain available in the following month.
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(row).toContainText("Belum lunas");
  await row.getByRole("button", { name: "Edit Uji pembelian kredit" }).click();
  await expect(dueDate).toHaveValue("2026-11-01");
  await dialog
    .getByLabel("Status kredit", { exact: true })
    .selectOption("paid");
  const paidDate = dialog.getByLabel("Tanggal pembayaran", { exact: true });
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await paidDate.evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
  await paidDate.fill("2026-09-30");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("tanggal pembayaran");
  await paidDate.fill("2026-11-05");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(row).toContainText("Lunas 05/11/2026");
  await expectCreditAnalytics("Rp 0", "Rp 0", "Belum ada pemasukan");
  await expectBalance("250.000");
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await expect(row).toContainText("Lunas 05/11/2026");
  await expectBalance("4.435.000");
  await row.getByRole("button", { name: "Edit Uji pembelian kredit" }).click();
  await expect(paidDate).toHaveValue("2026-11-05");
  await dialog
    .getByLabel("Status kredit", { exact: true })
    .selectOption("unpaid");
  await expect(paidDate).toHaveCount(0);
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(row).toContainText("Belum lunas");
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expectBalance("Rp 0");
  await row.getByRole("button", { name: "Edit Uji pembelian kredit" }).click();
  await dialog.getByLabel("Pembayaran", { exact: true }).selectOption("direct");
  await expect(dueDate).toHaveCount(0);
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(row).toContainText("Pembayaran langsung");
  await expect(row).not.toContainText("Jatuh tempo");
  await openAnalytics();
  await expect(page.locator(".credit-analytics")).toContainText(
    "Belum ada kredit pada periode ini.",
  );
  await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Cari transaksi" })
    .fill("Uji pembelian kredit");
  await expectBalance("4.185.000");
  await row.getByRole("button", { name: "Edit Uji pembelian kredit" }).click();
  await expect(dialog.getByLabel("Pembayaran", { exact: true })).toHaveValue(
    "direct",
  );
  await dialog.getByLabel("Jenis transaksi").selectOption("in");
  await expect(dialog.getByLabel("Pembayaran", { exact: true })).toHaveCount(0);
});
