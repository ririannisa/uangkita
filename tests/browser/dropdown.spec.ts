import { test, expect } from "@playwright/test";

test("styled dropdown supports selection, keyboard and dismissal", async ({
  page,
}, info) => {
  await page.goto("/demo");
  await page
    .locator(".quick-menu")
    .getByRole("button", { name: "Catat transaksi", exact: true })
    .click();
  const select = page.getByLabel("Jenis transaksi", { exact: true });
  await expect(select).toHaveCSS("border-radius", "12px");
  await select.click();
  await page.screenshot({
    path: `artifacts/${info.project.name}-dropdown.png`,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await select.selectOption("in");
  await expect(select).toHaveValue("in");
  await select.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).toHaveValue("out");
  await expect(select).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
