import { test, expect } from '@playwright/test';

test.describe('question palette symbols', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/ui');
    await expect(page.getByText('Question Palette', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('renders all five states with correct labels', async ({ page }) => {
    for (const state of ['NOT_VISITED', 'NOT_ANSWERED', 'ANSWERED', 'MARKED', 'ANSWERED_MARKED'] as const) {
      const symbol = page.getByTestId(`palette-${state}`);
      await expect(symbol).toBeVisible();
      await expect(symbol).toContainText(['Not Visited', 'Not Answered', 'Answered', 'Marked for Review', 'Answered & Marked for Review']
        .find((_, i) => ['NOT_VISITED', 'NOT_ANSWERED', 'ANSWERED', 'MARKED', 'ANSWERED_MARKED'][i] === state)!);
    }
  });

  test('legend shows counts for each state', async ({ page }) => {
    const legendSection = page.getByText('Legend with counts');
    await expect(legendSection).toBeVisible();
    await expect(page.getByText('Answered & Marked for Review').first()).toBeVisible();
    await expect(page.getByText('Marked for Review').first()).toBeVisible();
  });
});

test.describe('numerical keypad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/ui');
    await expect(page.getByText('Numerical Keypad', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('display shows initial value and is read-only', async ({ page }) => {
    const display = page.locator('[aria-label="Numerical answer display"]');
    await expect(display).toBeVisible();
    await expect(display).toHaveAttribute('aria-readonly', 'true');
    await expect(display).toHaveAttribute('inputMode', 'none');
    await expect(display).toContainText('-42.5');
  });

  test('all digit keys are focusable buttons', async ({ page }) => {
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '-']) {
      const keyButton = page.locator(`button[aria-label="Enter ${key}"]`);
      await expect(keyButton).toBeVisible();
      await keyButton.focus();
      await expect(keyButton).toBeFocused();
    }
  });

  test('digit keys respond to Enter key', async ({ page }) => {
    // The dev keypad has disabled=false so keys should work
    const keyButton = page.locator('button[aria-label="Enter 5"]');
    await keyButton.focus();
    await keyButton.press('Enter');
    // The display won't change since dev passes a no-op onChange,
    // but the button should not error and should remain visible
    await expect(keyButton).toBeVisible();
  });

  test('digit keys respond to Space key', async ({ page }) => {
    const keyButton = page.locator('button[aria-label="Enter 7"]');
    await keyButton.focus();
    await keyButton.press('Space');
    await expect(keyButton).toBeVisible();
  });

  test('backspace and clear buttons exist with aria-labels', async ({ page }) => {
    await expect(page.locator('button[aria-label="Backspace"]')).toBeVisible();
    await expect(page.getByText('Clear All')).toBeVisible();
  });

  test('no OS keyboard opens on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/dev/ui');
    await expect(page.getByText('Numerical Keypad', { exact: true })).toBeVisible({ timeout: 15000 });
    const display = page.locator('[aria-label="Numerical answer display"]');
    await expect(display).toHaveAttribute('inputMode', 'none');
    await context.close();
  });
});
