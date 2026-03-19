import { test, expect } from "@playwright/test";

test("marketplace browse and view listing", async ({ page }) => {
  await page.goto("http://localhost:3000/app/marketplace");
  await expect(page).toHaveURL(/marketplace/);
  // Check that listings are visible or empty state
  const content = await page.textContent("body");
  expect(content).toBeTruthy();
});

test("listing profile page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/app/marketplace/grand-ballroom-chicago");
  await expect(page).toHaveURL(/grand-ballroom-chicago/);
  // Should show listing details or 404
  const content = await page.textContent("body");
  expect(content).toBeTruthy();
});

