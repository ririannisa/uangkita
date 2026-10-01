import { test, expect } from "@playwright/test";
test("prepare category before a transaction or budget", async ({ page }) => {
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Kelola Kategori", exact: true })
    .click();
  await page.getByLabel("Nama kategori baru").fill("Hewan Peliharaan");
  await page
    .getByRole("button", { name: "Tambah kategori", exact: true })
    .click();
  await expect(page.locator(".category-chips")).toContainText(
    "Hewan Peliharaan",
  );
  await page.getByLabel("Nama kategori baru").fill(" hewan peliharaan ");
  await page
    .getByRole("button", { name: "Tambah kategori", exact: true })
    .click();
  await expect(
    page.locator(".category-manager").getByRole("status"),
  ).toHaveText("Kategori tersebut sudah tersedia.");
  await page.getByRole("button", { name: "Tutup kategori" }).click();
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Catat transaksi", exact: true })
    .click();
  await expect(
    page.locator("#categories option[value='Hewan Peliharaan']"),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Anggaran", exact: true })
    .click();
  await page
    .locator(".section-heading")
    .getByRole("button", { name: "Anggaran", exact: true })
    .click();
  await expect(
    page.locator("#categories option[value='Hewan Peliharaan']"),
  ).toHaveCount(1);
});
