import { test } from '@playwright/test';
import { stockpulse } from '../../src/diagrams/stockpulse';
import { baro } from '../../src/diagrams/baro';
import { scrollToStep, waitForScrolly } from './helpers';

// 사람이 눈으로 확인하는 스크린샷. `npm run test:visual`로만 돈다(@visual).
for (const [slug, spec] of [
  ['baro', baro],
  ['stockpulse', stockpulse],
] as const) {
  test(`@visual ${slug} diagram, every step`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/projects/${slug}/`);
    await waitForScrolly(page);
    for (let i = 0; i < spec.steps.length; i += 1) {
      await scrollToStep(page, i);
      await page.waitForTimeout(150);
      await page.locator('.s-fig').screenshot({ path: `test-results/visual/${slug}-step-${String(i).padStart(2, '0')}.png` });
    }
  });
}
