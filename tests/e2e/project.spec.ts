import { expect, test } from '@playwright/test';
import { PROJECT_SECTIONS } from '../../src/lib/site';
import { collectPageErrors } from './helpers';

test.describe('BARO case study (ko)', () => {
  test('renders the eight sections in order with no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/projects/baro/');
    await expect(page.locator('h1')).toContainText('BARO');
    const ids = await page.locator('main section.section').evaluateAll((els) => els.map((el) => el.id));
    expect(ids).toEqual([...PROJECT_SECTIONS]);
    await expect(page.locator('.toc a')).toHaveCount(8);
    expect(errors).toEqual([]);
  });

  test('lists incidents, decisions and prose in their sections', async ({ page }) => {
    await page.goto('/projects/baro/');
    await expect(page.locator('#ops .incident')).toHaveCount(3);
    await expect(page.locator('#ops .incident').first().locator('h3')).toHaveText('Kafka가 멈추자 관제 화면도 멈췄다');
    await expect(page.locator('#incident-baro-kafka-block')).toBeVisible();
    await expect(page.locator('#decisions .decision')).toHaveCount(6);
    await expect(page.locator('#overview')).toContainText('호출 → 배차 → 이동 → 재배치');
    await expect(page.locator('#infra')).toContainText('runtime_enabled');
    await expect(page.locator('#contribution .pending')).toBeVisible();
  });

  test('the table of contents follows the reading position', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/baro/');
    await page.evaluate(() => document.getElementById('decisions')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(page.locator('.toc a[data-toc="decisions"]')).toHaveAttribute('aria-current', 'location');
  });

  test('the table of contents marks the last section at the bottom of the page', async ({ page }) => {
    for (const height of [900, 1400]) {
      await page.setViewportSize({ width: 1440, height });
      for (const path of ['/projects/baro/', '/projects/stockpulse/']) {
        await page.goto(path);
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        await expect(page.locator('.toc a[data-toc="retrospective"]'), `${path} at ${height}px`).toHaveAttribute(
          'aria-current',
          'location',
        );
      }
    }
  });

  test('has no horizontal overflow on a 390px phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/projects/baro/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the StockPulse page exists before its content is written', async ({ page }) => {
    const res = await page.goto('/projects/stockpulse/');
    expect(res?.status()).toBe(200);
  });
});

test.describe('StockPulse case study (ko)', () => {
  test('lists its incidents, decisions and prose', async ({ page }) => {
    await page.goto('/projects/stockpulse/');
    await expect(page.locator('h1')).toContainText('StockPulse');
    await expect(page.locator('#ops .incident')).toHaveCount(4);
    await expect(page.locator('#ops .incident').first().locator('h3')).toHaveText('ArgoCD가 영원히 OutOfSync');
    await expect(page.locator('#decisions .decision')).toHaveCount(6);
    await expect(page.locator('#overview')).toContainText('미국 68종목과 한국 40종목');
    await expect(page.locator('#infra')).toContainText('Sealed Secrets');
  });
});
