import { expect, test } from "@playwright/test";

const bannedCopy = /coming soon|TODO|placeholder|Video Tutorials|API Documentation/i;

test("Help Center role and article smoke", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(bannedCopy);

  const proPlannerHref = await page.getByRole("link", { name: /View Pro Planner guides/i }).getAttribute("href");
  expect(proPlannerHref).toBe("/help/roles/pro-planner");
  await page.goto(proPlannerHref!);
  await expect(page).toHaveURL(/\/help\/roles\/pro-planner$/);
  await expect(page.getByRole("heading", { name: /Help for Pro Planners/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(bannedCopy);

  const messageGuideHref = await page.getByRole("link", { name: /Send a message as a pro planner/i }).getAttribute("href");
  expect(messageGuideHref).toBe("/help/articles/pro-planner-send-message");
  await page.goto(messageGuideHref!);
  await expect(page).toHaveURL(/\/help\/articles\/pro-planner-send-message$/);
  await expect(page.getByRole("heading", { name: /Send a message as a pro planner/i })).toBeVisible();
  await expect(page.getByText(/Click Send/i)).toBeVisible();
  await expect(page.getByText(/private planner-only notes/i).first()).toBeVisible();

  const paymentGuideHref = await page.getByRole("link", { name: /Understand payment readiness/i }).getAttribute("href");
  expect(paymentGuideHref).toBe("/help/articles/understand-payment-readiness");
  await page.goto(paymentGuideHref!);
  await expect(page).toHaveURL(/\/help\/articles\/understand-payment-readiness$/);
  await expect(page.getByText(/guarded private-pilot/i).first()).toBeVisible();

  await page.goto("/help/roles/diy-planner");
  await expect(page.getByRole("heading", { name: /Help for DIY Planners/i })).toBeVisible();
  const sourcingGuideHref = await page.getByRole("link", { name: /Source vendors and venues/i }).getAttribute("href");
  expect(sourcingGuideHref).toBe("/help/articles/source-vendors-and-venues");
  await page.goto(sourcingGuideHref!);
  await expect(page).toHaveURL(/\/help\/articles\/source-vendors-and-venues$/);
  await expect(page.locator("body")).not.toContainText(bannedCopy);
});
