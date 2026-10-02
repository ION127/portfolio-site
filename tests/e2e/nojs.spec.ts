import { expect, test } from '@playwright/test';
import { baro } from '../../src/diagrams/baro';
import { stockpulse } from '../../src/diagrams/stockpulse';

const CASES = [
  ['/projects/baro/', baro, 'ko'],
  ['/en/projects/baro/', baro, 'en'],
  ['/projects/stockpulse/', stockpulse, 'ko'],
  ['/en/projects/stockpulse/', stockpulse, 'en'],
] as const;

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, spec, locale] of CASES) {
    test(`${path}: the architecture section still reads as a document`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.scard')).toHaveCount(spec.steps.length);
      await expect(page.locator('.arch [data-node]')).toHaveCount(spec.nodes.length);
      await expect(page.locator('#architecture')).toContainText(spec.nodes[0]!.title[locale]);
      await expect(page.locator('.toc a')).toHaveCount(8);
    });
  }

  test('the BARO walkthrough keeps its prose', async ({ page }) => {
    await page.goto('/projects/baro/');
    await expect(page.locator('#architecture')).toContainText('공유 구독');
  });
});
