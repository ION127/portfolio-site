import { expect, test } from '@playwright/test';
import { collectPageErrors } from './helpers';

const PAGES = ['/', '/en/', '/projects/baro/', '/projects/stockpulse/', '/en/projects/baro/', '/en/projects/stockpulse/'];

for (const path of PAGES) {
  test(`${path} opens without console errors`, async ({ page }) => {
    const errors = collectPageErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
