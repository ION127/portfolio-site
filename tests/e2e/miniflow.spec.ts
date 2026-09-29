import { expect, test } from '@playwright/test';

async function waitForPipeline(page: import('@playwright/test').Page) {
  await page.locator('#infra').scrollIntoViewIfNeeded();
  await page.locator('#infra astro-island:not([ssr]) .miniflow').waitFor();
}

test('the deploy pipeline animates in the infrastructure section', async ({ page }) => {
  await page.goto('/projects/baro/');
  await waitForPipeline(page);
  await expect(page.locator('#infra .mf-dot')).toHaveCount(3);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('keeps the pipeline still', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForPipeline(page);
    await page.waitForTimeout(300);
    await expect(page.locator('#infra .mf-dot')).toHaveCount(0);
  });
});
