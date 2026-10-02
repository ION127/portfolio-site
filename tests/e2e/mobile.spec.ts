import { expect, test } from '@playwright/test';

const PAGES = ['/', '/en/', '/projects/baro/', '/projects/stockpulse/', '/en/projects/baro/', '/en/projects/stockpulse/'];

test.describe('390px phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of PAGES) {
    test(`${path} fits the screen without horizontal scrolling`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('keeps the menu links on a phone', async ({ page }) => {
    for (const [path, label] of [['/projects/baro/', '주요 메뉴'], ['/en/', 'Main menu']]) {
      await page.goto(path);
      const links = page.getByRole('navigation', { name: label }).getByRole('link');
      await expect(links).toHaveCount(3);
      for (const link of await links.all()) await expect(link).toBeVisible();
    }
  });

  test('case studies stack the diagram above the text and hide the table of contents', async ({ page }) => {
    await page.goto('/projects/baro/');
    await expect(page.locator('.toc-col')).toBeHidden();
    const direction = await page.locator('.scrolly').evaluate((el) => getComputedStyle(el).flexDirection);
    expect(direction).toBe('column-reverse');
  });
});
