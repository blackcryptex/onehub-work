import { test, expect } from "@playwright/test";

test("unauthenticated access to /app redirects to /signin", async ({ page }) => {
  const res = await page.goto("http://localhost:3000/app");
  expect(res?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/signin/);
});
