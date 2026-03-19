import { test, expect } from '@playwright/test';

test('only one Action Bar is visible and all tabs work', async ({ page }) => {
  await page.goto('/diy-planner');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Count buttons by labels (one of each, not duplicated)
  const labels = ['Vendors','Proposals','Contracts','Budget','Guests','Tasks','Milestones'];
  
  for (const label of labels) {
    // Check that each label appears exactly once
    const buttons = page.getByRole('button', { name: label });
    await expect(buttons).toHaveCount(1);
  }
  
  // Clicking cycles panes - verify all tabs are clickable
  for (const label of labels) {
    const button = page.getByRole('button', { name: label });
    await button.click();
    // Verify main content area is visible (panes should render)
    await expect(page.locator('main')).toBeVisible();
  }
});

