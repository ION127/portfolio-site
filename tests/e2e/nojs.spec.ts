import { expect, test } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the architecture section still reads as a document', async ({ page }) => {
    await page.goto('/projects/baro/');
    await expect(page.locator('.scard')).toHaveCount(13);
    await expect(page.locator('.arch [data-node]')).toHaveCount(20);
    await expect(page.locator('#architecture')).toContainText('공유 구독');
    await expect(page.locator('.toc a')).toHaveCount(8);
  });
});
