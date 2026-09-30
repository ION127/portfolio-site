import { expect, test } from '@playwright/test';
import { collectPageErrors } from './helpers';

test.describe('home (ko)', () => {
  test('shows every section with no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('서비스가 멈추지 않도록');
    await expect(page.locator('.metric')).toHaveCount(4);
    await expect(page.locator('.metric[data-fact="baro.vehicles"] .v')).toContainText('1,500');
    await expect(page.locator('#projects .card')).toHaveCount(2);
    await expect(page.locator('#projects .card h3 a').first()).toHaveAttribute('href', '/projects/baro/');
    await expect(page.locator('#ops .incident')).toHaveCount(3);
    await expect(page.locator('#ops .incident .tag')).toHaveText(['BARO', 'BARO', 'StockPulse']);
    await expect(page.locator('.stack .grp')).toHaveCount(6);
    await expect(page.locator('#about .pending')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('highlight cards link to the full write-up', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ops .incident h3 a').first().click();
    await expect(page).toHaveURL('/projects/baro/#incident-baro-kafka-block');
    await expect(page.locator('#incident-baro-kafka-block')).toBeInViewport();
  });

  test('the hero flow switches scenes on its own', async ({ page }) => {
    await page.goto('/');
    await page.locator('astro-island:not([ssr]) .miniflow.mode-auto').waitFor();
    await expect(page.locator('.mode-auto [data-scene="1"]')).toHaveCSS('opacity', '1', { timeout: 8000 });
    await expect(page.locator('.mode-auto .mf-head b')).toHaveText('StockPulse · 이상 탐지 파이프라인');
  });

  test('has no horizontal overflow on a 390px phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('home with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('keeps the first scene still', async ({ page }) => {
    await page.goto('/');
    await page.locator('astro-island:not([ssr]) .miniflow.mode-auto').waitFor();
    await page.waitForTimeout(6500);
    await expect(page.locator('.mode-auto [data-scene="0"]')).toHaveCSS('opacity', '1');
    await expect(page.locator('.mode-auto .mf-dot')).toHaveCount(0);
  });
});
