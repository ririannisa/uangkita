import { test, expect } from "../../../../node_modules/@playwright/test";

test("React Native screens keep feature history, form return, validation and savings allocation", async ({
  page,
}) => {
  test.setTimeout(90000); // First Metro compilation also includes the native SVG icon library.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Masuk dengan Google" }),
  ).toBeVisible();
  await expect(
    page.getByText("DOMPETMU, CERITAMU", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-native-login.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Coba mode demo", exact: true })
    .click();
  await expect(
    page.getByText("Sisa saldo bulan ini", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("DOMPET PRIBADI", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-native-home.png",
    fullPage: true,
  });
  const bottom = page
    .getByRole("button", { name: "Anggaran", exact: true })
    .last();
  await bottom.click();
  await expect(
    page.getByText("Rencana & realisasi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lihat tabungan", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Total tabungan · seluruh periode", { exact: true }),
  ).toBeVisible();
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
    .getByRole("button", { name: "Coba mode demo", exact: true })
    .click();
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
