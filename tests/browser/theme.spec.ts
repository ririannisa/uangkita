import { test, expect } from "@playwright/test";

test("login and dashboard share the mint/lilac palette", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".login-story")).toHaveCSS(
    "background-color",
    "rgb(222, 243, 236)",
  );
  await expect(page.locator(".login-fields > .primary")).toHaveCSS(
    "background-color",
    "rgb(114, 84, 173)",
  );
  await page.goto("/demo");
  await expect(
    page
      .locator(".quick-menu")
      .getByRole("button", { name: "Ruang Bersama", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".space-switcher")).toHaveCount(0);
  await expect(page.locator(".home-header")).toHaveCSS(
    "background-color",
    "rgb(222, 243, 236)",
  );
  await expect(page.locator(".balance-card-top")).toHaveCSS(
    "background-color",
    "rgb(238, 229, 248)",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(249, 250, 246)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("purple neon theme toggles, survives reload, and styles dialogs", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/demo");
  const toggle = page.getByRole("button", {
    name: "Ganti tema terang atau gelap",
  });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle.locator(".theme-sun")).toBeVisible();
  await expect(toggle.locator(".theme-moon")).toBeHidden();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(6, 8, 16)",
  );
  await expect(page.locator(".balance-card")).toHaveCSS(
    "color",
    "rgb(244, 246, 252)",
  );
  await page.screenshot({
    path: `artifacts/${info.project.name}-dark-home.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.reload();
  await expect(toggle.locator(".theme-sun")).toBeVisible();
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Catat transaksi" })
    .click();
  const dialog = page.locator(".entry-dialog[open]");
  await expect(dialog).toHaveCSS("background-color", "rgb(16, 19, 31)");
  await expect(dialog.locator("select").first()).toHaveCSS(
    "background-color",
    "rgb(16, 19, 31)",
  );
  await page.keyboard.press("Escape");

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(toggle.locator(".theme-moon")).toBeVisible();
  await expect(page.locator(".home-header")).toHaveCSS(
    "background-color",
    "rgb(222, 243, 236)",
  );
  expect(errors).toEqual([]);
});

test("theme toggle works when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Ganti tema terang atau gelap" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
