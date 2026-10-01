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
