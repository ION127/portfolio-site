import { expect, test } from '@playwright/test';
import { scrollToStep, waitForScrolly } from './helpers';

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('no packets and an immediate camera move', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await scrollToStep(page, 5);
    await expect(page.locator('.scard').nth(5)).toHaveClass(/\bact\b/);
    await expect(page.locator('.arch')).toHaveAttribute('viewBox', '137.50 0.00 770.00 406.00', { timeout: 500 });
    await expect(page.locator('.arch .pk')).toHaveCount(0);
  });
});
