import { test, expect } from '@playwright/test';

const LEVELS = ['UNRATED', 'WHITE', 'YELLOW', 'GREEN', 'BLUE', 'BROWN', 'BLACK'] as const;
const SIZES = [
  { name: 'sm', index: 1 },
  { name: 'md', index: 2 },
  { name: 'lg', index: 3 },
] as const;

test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });

test.describe('belt artwork', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/ui');
    await expect(page.getByText('Mastery Belts', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  for (const level of LEVELS) {
    for (const size of SIZES) {
      test(`${level} at ${size.name}`, async ({ page }) => {
        const group = page.getByTestId(`belt-group-${level}`);
        const belt = group.locator('svg[role="img"]').nth(size.index);
        await belt.scrollIntoViewIfNeeded();
        await expect(belt).toBeVisible({ timeout: 10000 });
        await expect(belt).toHaveScreenshot(`belt-${level.toLowerCase()}-${size.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  }
});
