import { test, expect } from "@playwright/test";

test("budget drill-down, edit, period isolation, and analytics", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Keuangan rapi, hati tenang." }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/${info.project.name}-home.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Lihat peringatan anggaran" }).click();
  const card = page
    .locator(".budget-card")
    .filter({
      has: page.getByRole("heading", { name: "Makan & minum", exact: true }),
    });
  await expect(card).toContainText("112% terpakai");
  await expect(card).toContainText("Belanja kebutuhan dapur");
  await card.locator("summary").click();
  await expect(card.locator(".transaction")).toHaveCount(3);
  await expect(card.locator(".transaction").first()).toContainText(
    "Belanja kebutuhan dapur",
  );
  await page.screenshot({
    path: `artifacts/${info.project.name}-budget.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Edit anggaran Makan & minum", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nominal", exact: true })
    .fill("2000000");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(card).toContainText("84% terpakai");
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await expect(page.getByText(/Belum ada anggaran untuk/)).toBeVisible();
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(card).toContainText("84% terpakai");
  const nav =
    info.project.name === "mobile"
      ? page.locator(".bottom-nav")
      : page.locator(".desktop-sidebar");
  await nav.getByRole("button", { name: "Beranda", exact: true }).click();
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Analitik", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Arus kas 6 bulan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await expect(
    page.getByText("Grafik akan terisi setelah kamu mencatat pengeluaran."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(page.locator(".category-breakdown")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("transaction form, validation, and unauthenticated API protection", async ({
  page,
  request,
}, info) => {
  await page.goto("/demo");
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Catat transaksi", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nominal", exact: true })
    .fill("150000");
  await page.getByLabel("Kategori", { exact: true }).fill("Makan & minum");
  await page.getByLabel("Catatan", { exact: false }).fill("Uji makan siang");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const nav =
    info.project.name === "mobile"
      ? page.locator(".bottom-nav")
      : page.locator(".desktop-sidebar");
  await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Cari transaksi" })
    .fill("Uji makan siang");
  await expect(page.locator(".transaction")).toHaveCount(1);
  await expect(page.locator(".transaction")).toContainText("150.000");
  const unauthenticated = await request.get("/api/finance");
  expect(unauthenticated.status()).toBe(401);
  const forged = await request.post("/api/finance", {
    headers: { origin: "https://untrusted.example" },
    data: { action: "reset", confirmation: "HAPUS" },
  });
  expect(forged.status()).toBe(403);
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Google", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await expect(
    page.getByRole("textbox", { name: "Nama lengkap" }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/${info.project.name}-login.png`,
    fullPage: true,
  });
});
