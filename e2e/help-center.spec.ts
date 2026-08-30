import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const bannedCopy = /coming soon|TODO|placeholder|Video Tutorials|API Documentation/i;
const smokeArtifactPath = "test-results/help-center-smoke.png";

async function expectPageOk(page: Page, url: string) {
  const response = await page.goto(url);
  expect(response?.ok()).toBe(true);
}

test("Help Center role and article smoke", async ({ page }) => {
  await expectPageOk(page, "/help");
  await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(bannedCopy);

  const proPlannerHref = await page.getByRole("link", { name: /View Pro Planner guides/i }).getAttribute("href");
  expect(proPlannerHref).toBe("/help/roles/pro-planner");
  await page.getByRole("link", { name: /View Pro Planner guides/i }).click();
  await expect(page).toHaveURL(/\/help\/roles\/pro-planner$/);
  await expect(page.getByRole("heading", { name: /Help for Pro Planners/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(bannedCopy);

  const messageGuideHref = await page.getByRole("link", { name: /Send a message as a pro planner/i }).getAttribute("href");
  expect(messageGuideHref).toBe("/help/articles/pro-planner-send-message");
  await page.getByRole("link", { name: /Send a message as a pro planner/i }).click();
  await expect(page).toHaveURL(/\/help\/articles\/pro-planner-send-message$/);
  await expect(page.getByRole("heading", { name: /Send a message as a pro planner/i })).toBeVisible();
  await expect(page.getByText(/Click Send/i)).toBeVisible();
  await expect(page.getByText(/private planner-only notes/i).first()).toBeVisible();

  const paymentGuideHref = await page.getByRole("link", { name: /Understand payment readiness/i }).getAttribute("href");
  expect(paymentGuideHref).toBe("/help/articles/understand-payment-readiness");
  await page.getByRole("link", { name: /Understand payment readiness/i }).click();
  await expect(page).toHaveURL(/\/help\/articles\/understand-payment-readiness$/);
  await expect(page.getByText(/guarded private-pilot/i).first()).toBeVisible();

  await expectPageOk(page, "/help/roles/diy-planner");
  await expect(page.getByRole("heading", { name: /Help for DIY Planners/i })).toBeVisible();
  const sourcingGuideHref = await page.getByRole("link", { name: /Source vendors and venues/i }).getAttribute("href");
  expect(sourcingGuideHref).toBe("/help/articles/source-vendors-and-venues");
  await page.getByRole("link", { name: /Source vendors and venues/i }).click();
  await expect(page).toHaveURL(/\/help\/articles\/source-vendors-and-venues$/);
  await expect(page.locator("body")).not.toContainText(bannedCopy);
  mkdirSync(dirname(smokeArtifactPath), { recursive: true });
  await page.screenshot({ fullPage: true, path: smokeArtifactPath });
});
