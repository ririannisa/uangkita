import { test, expect } from "@playwright/test";
import { today } from "../../lib/finance";

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
  const card = page.locator(".budget-card").filter({
    has: page.getByRole("heading", { name: "Makan & minum", exact: true }),
  });
  await expect(card).toContainText("112% terpakai");
  await expect(card).toContainText("Jatah makan per hari");
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
  const allowanceResponse = page.waitForResponse((response) => response.url().endsWith("/api/finance/preview") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  const allowanceData = await (await allowanceResponse).json();
  const daily = allowanceData.budgets.find((budget: { name: string }) => budget.name === "Makan & minum").dailyFoodAllowance;
  expect(daily.daily).toBeGreaterThan(0);
  await expect(card.locator(".daily-food-allowance strong")).toHaveText(new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(daily.daily));
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
  await expect(page.getByTestId("financial-bars")).toHaveCount(2);
  await expect(page.getByTestId("category-donut")).toBeVisible();
  await expect(page.getByTestId("budget-realization-chart")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /^Rasio beban kredit:/ }),
  ).toBeVisible();
  await page
    .getByTestId("financial-bars")
    .first()
    .locator(".recharts-bar-rectangle")
    .last()
    .hover();
  await expect(
    page
      .getByTestId("financial-bars")
      .first()
      .locator(".recharts-tooltip-wrapper"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-library-analytics.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  await expect(
    page.getByText("Grafik akan terisi setelah kamu mencatat pengeluaran."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(page.locator(".category-breakdown")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("web matches mobile category filters, credit, active state and theme choices", async ({ page }, info) => {
  await page.goto("/demo");
  await page.locator(".quick-menu").getByRole("button", { name: "Kelola Kategori", exact: true }).click();
  await page.getByRole("textbox", { name: "Nama kategori baru" }).fill("Zakat");
  await page.getByRole("button", { name: "Tambah kategori", exact: true }).click();
  await expect(page.getByText("Kategori berhasil ditambahkan.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tutup kategori", exact: true }).click();
  await page.locator(".quick-menu").getByRole("button", { name: "Catat transaksi", exact: true }).click();
  await page.getByRole("textbox", { name: "Nominal", exact: true }).fill("150000");
  await page.getByLabel("Kategori", { exact: true }).fill(" zakat ");
  await page.getByLabel("Catatan", { exact: false }).fill("Uji kategori API");
  await page.getByRole("combobox", { name: "Pembayaran", exact: true }).selectOption("credit");
  await page.getByLabel("Jatuh tempo", { exact: true }).fill(today());
  await page.getByRole("checkbox", { name: "Aktif dalam perhitungan", exact: true }).uncheck();
  const response = page.waitForResponse((r) => r.url().endsWith("/api/finance/preview") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  const data = await (await response).json();
  const saved = data.entries.find((entry: { note: string }) => entry.note === "Uji kategori API");
  expect(saved.category).toBe("Zakat");
  expect(saved.active).toBe(false);
  const nav = page.locator(info.project.name === "mobile" ? ".bottom-nav" : ".desktop-sidebar");
  await nav.getByRole("button", { name: "Aktivitas", exact: true }).click();
  await page.getByRole("combobox", { name: "Kategori transaksi", exact: true }).selectOption("Zakat");
  await expect(page.locator(".transaction")).toHaveCount(1);
  await page.getByRole("button", { name: "Kredit", exact: true }).click();
  await expect(page.locator(".transaction")).toContainText("Uji kategori API");
  await page.getByRole("combobox", { name: "Kategori transaksi", exact: true }).selectOption("Transportasi");
  await expect(page.locator(".transaction")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await page.getByRole("button", { name: "Setoran", exact: true }).click();
  await expect(page.locator(".transaction")).toHaveCount(1);
  await page.getByRole("button", { name: "Penarikan", exact: true }).click();
  await expect(page.locator(".transaction")).toHaveCount(0);
  await nav.getByRole("button", { name: "Akun saya", exact: true }).click();
  const theme = page.getByRole("combobox", { name: "Tema aplikasi", exact: true });
  await theme.selectOption("neon");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await page.emulateMedia({ colorScheme: "dark" });
  await theme.selectOption("auto");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme.selectOption("neon");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await nav.getByRole("button", { name: "Akun saya", exact: true }).click();
  await expect(theme).toHaveValue("neon");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("API computes daily food allowance and complete categories from a validated snapshot", async ({ request }) => {
  const month = today().slice(0, 7);
  const snapshot = {
    version: 1,
    categories: ["Zakat"], entries: [],
    budgets: [{ id: crypto.randomUUID(), name: "Makan & minum", month, planned: 780000,
      dailyFoodAllowance: { daily: 99999999 } }],
    plans: [{ month, income: 520000 }],
  };
  const response = await request.post("/api/finance/preview", {
    headers: { origin: "http://localhost:3000" }, data: snapshot,
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const data = await response.json();
  expect(data.availableCategories).toContain("Zakat");
  expect(data.availableCategories).toContain("Makan & minum");
  const allowance = data.budgets[0].dailyFoodAllowance;
  expect(allowance.cashLimited).toBe(true);
  expect(allowance.daily).toBe(Math.floor(520000 / allowance.days));
  const invalid = await request.post("/api/finance/preview", {
    headers: { origin: "http://localhost:3000" }, data: { ...snapshot, plans: [{ month, income: -1 }] },
  });
  expect(invalid.status()).toBe(400);
  const forged = await request.post("/api/finance/preview", {
    headers: { origin: "https://untrusted.example" }, data: snapshot,
  });
  expect(forged.status()).toBe(403);
  const badJson = await request.post("/api/finance/preview", {
    headers: { origin: "http://localhost:3000", "content-type": "application/json" }, data: "{",
  });
  expect(badJson.status()).toBe(400);
  for (const endpoint of ["/api/finance", "/api/spaces", "/api/spaces/00000000-0000-4000-8000-000000000001/finance"]) {
    expect((await request.get(endpoint)).status()).toBe(401);
  }
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
