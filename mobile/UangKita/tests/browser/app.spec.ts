import { test, expect, type Page } from "../../../../node_modules/@playwright/test";
import { applyMutation } from "../../src/lib/core";
import { sampleData } from "../fixtures";
import { emptyData, mutationSchema, today, withFinanceDetails, type FinanceData } from "../../src/lib/finance";

async function mockAccount(page: Page, data: FinanceData = sampleData(today().slice(0, 7))) {
  const account = { data, signedIn: false, deletionAttempts: 0, deletionError: "" };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let result: unknown;
    let status = 200;
    if (request.method() === "OPTIONS") result = {};
    else if (path === "/api/auth/sign-in/email") {
      account.signedIn = true;
      result = { ok: true };
    } else if (path === "/api/auth/sign-out") {
      account.signedIn = false;
      result = { ok: true };
    } else if (path === "/api/auth/get-session") {
      result = account.signedIn ? { user: {
        id: "test-user", name: "Annisa", email: "annisa@example.com", emailVerified: true,
      } } : null;
    } else if (!account.signedIn) {
      status = 401;
      result = { error: "Silakan masuk terlebih dahulu." };
    } else if (path === "/api/account/delete") {
      expect(request.postDataJSON()).toEqual({ confirmation: "HAPUS AKUN", acknowledgeSharedData: true });
      account.deletionAttempts++;
      if (account.deletionError) {
        status = 403;
        result = { error: account.deletionError };
      } else {
        account.signedIn = false;
        account.data = emptyData;
        result = { success: true, message: "User deleted" };
      }
    } else if (path === "/api/finance") {
      if (request.method() === "POST") {
        account.data = applyMutation(account.data, mutationSchema.parse(request.postDataJSON()));
        result = { ok: true };
      } else result = withFinanceDetails(account.data);
    } else if (path === "/api/spaces") {
      result = { spaces: [], invitations: [], emailVerified: true };
    } else throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ status, json: result, headers: {
      "Access-Control-Allow-Origin": "http://localhost:8091",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    } });
  });
  return account;
}

async function login(page: Page) {
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("annisa@example.com");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Masuk ke UangKita", exact: true }).click();
  await expect(page.getByText("DOMPET PRIBADI", { exact: true })).toBeVisible();
}

test("account deletion requires confirmation, preserves login on failure, and clears login on success", async ({ page }) => {
  test.setTimeout(90000); // The first screen may include a cold Metro compilation.
  const account = await mockAccount(page);
  await page.goto("/");
  await login(page);
  await page.getByRole("button", { name: "Akun saya", exact: true }).last().click();
  const remove = page.getByRole("button", { name: "Hapus akun permanen", exact: true });
  await expect(remove).toBeDisabled();
  await page.getByRole("textbox", { name: "Ketik HAPUS AKUN", exact: true }).fill("HAPUS");
  await expect(remove).toBeDisabled();
  await page.getByRole("textbox", { name: "Ketik HAPUS AKUN", exact: true }).fill("HAPUS AKUN");
  page.once("dialog", dialog => dialog.dismiss());
  await remove.click();
  expect(account.deletionAttempts).toBe(0);
  account.deletionError = "Keluar lalu masuk kembali untuk menghapus akun.";
  page.once("dialog", dialog => dialog.accept());
  await remove.click();
  await expect(page.getByText(account.deletionError, { exact: true }).last()).toBeAttached();
  expect(account.signedIn).toBe(true);
  expect(account.data.entries.length).toBeGreaterThan(0);
  await expect(remove).toBeEnabled();
  account.deletionError = "";
  page.once("dialog", dialog => dialog.accept());
  await remove.click();
  await expect(page.getByRole("button", { name: "Masuk ke UangKita", exact: true })).toBeVisible();
  expect(account.deletionAttempts).toBe(2);
  expect(account.signedIn).toBe(false);
  expect(account.data.entries).toHaveLength(0);
});

test("recording can search every saved category and reuse its name without duplicates", async ({ page }) => {
  const data = sampleData(today().slice(0, 7));
  data.categories = ["Zakat"];
  const account = await mockAccount(page, data);
  await page.goto("/");
  await login(page);
  await page.getByRole("button", { name: "Aktivitas", exact: true }).last().click();
  await page.getByRole("button", { name: "＋ Catat transaksi", exact: true }).click();
  await page.getByRole("button", { name: "Kategori tersimpan: Pilih kategori", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Zakat", exact: true })).toHaveCount(1);
  const search = page.getByRole("textbox", { name: "Cari kategori tersimpan", exact: true });
  await search.fill("tidak-ada-kategori");
  await expect(page.getByText("Tidak ada pilihan yang cocok.", { exact: true })).toBeVisible();
  await search.fill(" zaKAT ");
  await page.getByRole("radio", { name: "Zakat", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Kategori", exact: true })).toHaveValue("Zakat");
  await page.getByRole("button", { name: "Kategori tersimpan: Zakat", exact: true }).click();
  await expect(search).toHaveValue("");
  await page.getByRole("radio", { name: "Transportasi", exact: true }).click();
  await page.getByRole("textbox", { name: "Kategori", exact: true }).fill(" zakat ");
  await page.getByRole("textbox", { name: "Nominal (Rp)", exact: true }).fill("150000");
  await page.getByRole("textbox", { name: "Catatan", exact: true }).fill("Tes kategori tersimpan");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Cari transaksi", exact: true })).toBeVisible();
  expect(account.data.entries.find((entry) => entry.note === "Tes kategori tersimpan")?.category).toBe("Zakat");
  await page.getByRole("button", { name: "Kategori: Semua kategori", exact: true }).click();
  await page.getByRole("textbox", { name: "Cari kategori", exact: true }).fill("zakat");
  await expect(page.getByRole("radio", { name: "Zakat", exact: true })).toHaveCount(1);
  await page.getByRole("radio", { name: "Zakat", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Tes kategori tersimpan,/ })).toBeVisible();
});

test("React Native screens keep feature history, form return, validation and savings allocation", async ({
  page,
}) => {
  test.setTimeout(90000); // First Metro compilation also includes the native SVG icon library.
  await mockAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Masuk dengan Google" }),
  ).toBeVisible();
  await expect(
    page.getByText("DOMPETMU, CERITAMU", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba mode demo", exact: true })).toHaveCount(0);
  await expect(page.getByText("Intip dulu juga boleh", { exact: true })).toHaveCount(0);
  await page.goto("/budget");
  await expect(page.getByRole("button", { name: "Masuk ke UangKita", exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-native-login.png",
    fullPage: true,
  });
  await login(page);
  await expect(
    page.getByText("Sisa saldo bulan ini", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("DOMPET PRIBADI", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-native-home.png",
    fullPage: true,
  });
  const navbar = page.getByTestId("bottom-nav");
  await navbar.evaluate((element) => {
    element.setAttribute("data-instance", "original");
  });
  const bottom = page
    .getByRole("button", { name: "Anggaran", exact: true })
    .last();
  await bottom.click();
  await expect(
    page.getByText("Rencana & realisasi", { exact: true }),
  ).toBeVisible();
  await expect(navbar).toHaveCount(1);
  await expect(navbar).toHaveAttribute("data-instance", "original");
  await expect(page.getByText("Jatah makan per hari", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rincian Makan & minum", exact: true }).click();
  await expect(page.getByText("Jatah makan per hari", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke fitur sebelumnya" }).last().click();
  await page
    .getByRole("button", { name: "Lihat tabungan", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Total tabungan · seluruh periode", { exact: true }),
  ).toBeVisible();
  await expect(navbar).toHaveAttribute("data-instance", "original");
  await page
    .getByRole("button", { name: "Kembali ke fitur sebelumnya" })
    .last()
    .click();
  await expect(
    page.getByText("Rencana & realisasi", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Buat target tabungan", exact: true })
    .click();
  await expect(navbar).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Nama target / tagihan" })
    .fill("Dana darurat");
  await page
    .getByRole("textbox", { name: "Nominal (Rp)", exact: true })
    .fill("3000000");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.getByText("Rencana & realisasi", { exact: true }),
  ).toBeVisible();
  await expect(navbar).toBeVisible();
  await expect(page.getByText("Rp 6.100.000", { exact: true })).toBeVisible();
  await expect(
    page
      .getByText("Sisa uang saat ini", { exact: true })
      .locator("../..")
      .getByText("Rp 4.435.000", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-native-budget.png",
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Aktivitas", exact: true })
    .last()
    .click();
  await page
    .getByRole("textbox", { name: "Cari transaksi", exact: true })
    .fill("Makan");
  await page
    .getByRole("button", { name: "＋ Catat transaksi", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nominal (Rp)", exact: true })
    .fill("150000");
  await page
    .getByRole("textbox", { name: "Kategori", exact: true })
    .fill("Makan & minum");
  await page
    .getByRole("textbox", { name: "Catatan", exact: true })
    .fill("Makan siang mobile");
  await page.getByRole("button", { name: "Kredit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Jatuh tempo", exact: true })
    .fill("2020-01-01");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Catatan", exact: true }),
  ).toHaveValue("Makan siang mobile");
  await page
    .getByRole("button", { name: "Bayar langsung", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Cari transaksi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Cari transaksi", exact: true }),
  ).toHaveValue("Makan");
  await page
    .getByRole("textbox", { name: "Cari transaksi", exact: true })
    .fill("Makan siang mobile");
  await expect(
    page.getByRole("button", { name: /^Makan siang mobile,/ }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Aktivitas", exact: true })
    .last()
    .click();
  await page
    .getByRole("textbox", { name: "Cari transaksi", exact: true })
    .fill("Makan siang mobile");
  await expect(
    page.getByRole("button", { name: /^Makan siang mobile,/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("mobile account, neon charts and category selection stay readable at phone width", async ({
  page,
}) => {
  const month = today().slice(0, 7);
  const data = sampleData(month);
  data.entries.push({
    ...data.entries[0],
    id: "00000000-0000-4000-8000-000000000090",
    category: "Kesehatan",
    note: "Kredit obat",
    amount: 1200000,
    paymentMethod: "credit",
    dueDate: month + "-20",
  });
  await mockAccount(page, data);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await login(page);
  await page
    .getByRole("button", { name: "Akun saya", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Analitik keuangan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Neon", exact: true }).click();
  await page.screenshot({
    path: "artifacts/mobile-neon-account.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Analitik keuangan", exact: true })
    .click();
  await expect(
    page.getByText("Arus kas 6 bulan", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Arus kas / })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Arus kas / })
    .last()
    .click();
  // Allow the chart library's entrance animation to finish before capture.
  await page.waitForTimeout(600);
  await page
    .getByTestId("cashflow-chart")
    .screenshot({ path: "artifacts/mobile-neon-cashflow.png" });
  await expect(
    page.getByRole("button", { name: "Kategori Makan & minum", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kategori Makan & minum", exact: true })
    .click();
  await expect(
    page.getByText("Kategori dipilih", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Realisasi anggaran", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Rasio beban kredit/ }),
  ).toBeVisible();
  await page
    .getByTestId("credit-chart")
    .screenshot({ path: "artifacts/mobile-neon-credit.png" });
  await page
    .getByTestId("budget-chart")
    .screenshot({ path: "artifacts/mobile-neon-budget-chart.png" });
  expect(
    (await page.getByTestId("budget-chart").boundingBox())!.height,
  ).toBeLessThan(1000);
  await page.screenshot({
    path: "artifacts/mobile-neon-analytics.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Aktivitas", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Kategori: Semua kategori", exact: true })
    .click();
  await page.getByRole("radio", { name: "Transportasi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Isi bensin,/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Sepatu kerja,/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/mobile-neon-filters.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Jenis transaksi: Semua", exact: true })
    .click();
  await page.getByRole("radio", { name: "Kredit", exact: true }).click();
  await expect(
    page.getByText("Tidak ada transaksi yang cocok", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Kredit obat,/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Akun saya", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Sembunyikan nominal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Analitik keuangan", exact: true })
    .click();
  await expect(page.getByText(/Rp\s*[\d.]+/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
