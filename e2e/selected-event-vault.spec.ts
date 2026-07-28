import { expect, test, type Page } from "@playwright/test";

const proStorageState = "e2e/.auth/pro.json";
const diyStorageState = "e2e/.auth/diy.json";
const diyEventSlug = process.env.PLAYWRIGHT_DIY_EVENT_SLUG ?? "diy-sample-event";
const commerceSpine = [
  "Discovery",
  "Shortlist",
  "Request",
  "Proposal",
  "Contract",
  "Payment",
  "Execution",
];

async function expectAuthenticatedRoute(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });

  expect(response, `${route} should return a browser response`).not.toBeNull();
  expect(response?.status(), `${route} should not return an error status`).toBeLessThan(400);
  await expect(page).not.toHaveURL(/\/signin(?:\?|$)/);
  await expect(page.locator("body")).toBeVisible();
}

test.describe("authenticated selected-event vault routes", () => {
  test.describe("Pro planner frozen commerce spine", () => {
    test.use({ storageState: proStorageState });

    test("loads /pro/planner/vault/demo-wedding with ordered commerce spine", async ({ page }) => {
      await expectAuthenticatedRoute(page, "/pro/planner/vault/demo-wedding");

      const spineContainer = page.locator("[data-commerce-spine]");
      await expect(spineContainer).toHaveAttribute("data-commerce-spine", commerceSpine.join("|"));
      await expect(spineContainer.locator("article h2")).toHaveText(commerceSpine);
    });
  });

  test.describe("DIY planner selected-event route", () => {
    test.use({ storageState: diyStorageState });

    test("loads verified DIY selected-event vault route without falling back to signin", async ({ page }) => {
      await expectAuthenticatedRoute(page, `/diy-planner/vault/${diyEventSlug}`);

      await expect(page.getByRole("heading", { name: /at a glance/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Proposals", exact: true })).toBeVisible();
    });
  });
});
