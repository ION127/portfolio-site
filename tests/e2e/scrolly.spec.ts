import { expect, test } from '@playwright/test';
import { baro } from '../../src/diagrams/baro';
import { formatView, targetView } from '../../src/lib/diagram/view';
import { collectPageErrors, scrollToStep, waitForScrolly } from './helpers';

test.describe('BARO architecture — side by side', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('scrolling activates a step, highlights its path and zooms to it', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await scrollToStep(page, 5);
    await expect(page.locator('.scard').nth(5)).toHaveClass(/\bact\b/);
    await expect(page.locator('.arch')).toHaveClass(/\bfocus\b/);
    for (const id of ['dispatch', 'valkey', 'rds']) {
      await expect(page.locator(`.arch [data-node="${id}"]`)).toHaveClass(/\bon\b/);
    }
    await expect(page.locator('.arch [data-edge="E12"]')).toHaveClass(/\bon\b/);
    await expect(page.locator('.arch [data-node="kafka"]')).not.toHaveClass(/\bon\b/);
    await expect.poll(() => page.locator('.arch').getAttribute('viewBox')).toBe('137.50 0.00 770.00 406.00');
    await expect(page.locator('.scap .cnt')).toHaveText('6 / 13');
    expect(errors).toEqual([]);
  });

  test('packets flow along the active routes', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await scrollToStep(page, 5);
    await expect(page.locator('.arch .pk')).toHaveCount(6);
    const dot = page.locator('.arch .pk').first();
    const before = `${await dot.getAttribute('cx')},${await dot.getAttribute('cy')}`;
    await page.waitForTimeout(300);
    const after = `${await dot.getAttribute('cx')},${await dot.getAttribute('cy')}`;
    expect(after).not.toBe(before);
  });

  test('a fast jump settles on the final step, not a stale camera', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await scrollToStep(page, 9);
    await page.waitForTimeout(100);
    await scrollToStep(page, 1);
    await expect(page.locator('.scard').nth(1)).toHaveClass(/\bact\b/);
    await expect
      .poll(() => page.locator('.arch').getAttribute('viewBox'))
      .toBe(formatView(targetView(baro, baro.steps[1], false)));
  });

  test('resizing across 900px switches to the stacked layout and re-aims the camera', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await scrollToStep(page, 5);
    await expect(page.locator('.scard').nth(5)).toHaveClass(/\bact\b/);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect
      .poll(() => page.locator('.scrolly').evaluate((el) => getComputedStyle(el).flexDirection))
      .toBe('column-reverse');
    await scrollToStep(page, 5);
    await expect(page.locator('.scard').nth(5)).toHaveClass(/\bact\b/);
    await expect
      .poll(() => page.locator('.arch').getAttribute('viewBox'))
      .toBe(formatView(targetView(baro, baro.steps[5], true)));
  });

  test('hovering a node shows its spec without a click', async ({ page }) => {
    await page.goto('/projects/baro/');
    await waitForScrolly(page);
    await page.locator('.arch [data-node="kafka"]').hover();
    await expect(page.locator('.sd-tip')).toContainText('EC2 t3.small');
  });
});
