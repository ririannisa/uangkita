import { test, expect } from "@playwright/test";

test("all personal features fit the viewport and keep the shared palette", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 780 });
  const check = async (name: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(249, 250, 246)",
    );
    await page.screenshot({
      path: `artifacts/audit-${info.project.name}-${name}.png`,
      fullPage: true,
    });
  };
  await check("home");
  const nav = page.locator(
    info.project.name === "mobile" ? ".bottom-nav" : ".desktop-sidebar",
  );
  for (const name of ["Aktivitas", "Anggaran", "Akun saya"]) {
    await nav.getByRole("button", { name, exact: true }).click();
    await check(name);
  }
  for (const name of ["Tabungan", "Analitik", "Pengeluaran tetap"]) {
    await nav.getByRole("button", { name: "Beranda", exact: true }).click();
    await page
      .locator(".quick-menu")
      .getByRole("button", { name, exact: true })
      .click();
    await check(name);
  }
  for (const name of ["Catat transaksi", "Pendapatan", "Kelola Kategori"]) {
    await nav.getByRole("button", { name: "Beranda", exact: true }).click();
    await page
      .locator(".quick-menu")
      .getByRole("button", { name, exact: true })
      .click();
    await check(name);
    await page.keyboard.press("Escape");
  }
  await page.goto("/login");
  await check("login");
  await page.getByRole("button", { name: "Daftar sekarang" }).click();
  await check("register");
  expect(errors).toEqual([]);
});
