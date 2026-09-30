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

test('bold monospace text uses the real JetBrains Mono bold instead of a synthesized one', async ({ page }) => {
  await page.goto('/404.html');
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.fonts].some(
          (f) => f.family.replace(/"/g, '') === 'JetBrains Mono' && f.weight === '700' && f.status === 'loaded',
        ),
      ),
    )
    .toBe(true);
});

for (const path of ['/', '/en/']) {
  test(`${path} footer shows the copyright without a tool credit`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('© 2026');
    await expect(footer).not.toContainText(/astro/i);
  });
}
