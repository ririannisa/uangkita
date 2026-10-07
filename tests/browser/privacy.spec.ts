import { test, expect } from "@playwright/test";

test("privacy and account deletion are public and direct users back after login", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Kebijakan Privasi UangKita" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "contact@aksenraras.my.id", exact: true }),
  ).toBeVisible();
  await page.goto("/delete-account");
  await expect(
    page.getByRole("heading", { name: "Hapus akun UangKita", exact: true }),
  ).toBeVisible();
  const login = page.getByRole("link", { name: "Masuk untuk menghapus akun" });
  await expect(login).toHaveAttribute(
    "href",
    "/login?returnTo=/delete-account",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const forbidden = await page.request.post("/api/account/delete", {
    data: { confirmation: "HAPUS AKUN", acknowledgeSharedData: true },
  });
  expect(forbidden.status()).toBe(403);
  const unauthenticated = await page.request.post("/api/account/delete", {
    headers: { Origin: "http://localhost:3000" },
    data: { confirmation: "HAPUS AKUN", acknowledgeSharedData: true },
  });
  expect(unauthenticated.status()).toBe(401);
  const bypass = await page.request.post("/api/auth/delete-user", { data: {} });
  expect(bypass.status()).toBe(403);
});
