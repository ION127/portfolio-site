import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openReplay(page: Page, path = '/projects/stockpulse/') {
  await page.goto(path);
  await page.locator('#demo').scrollIntoViewIfNeeded();
  await expect(page.locator('.spreplay')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
}

test.describe('StockPulse pipeline replay', () => {
  test('shows the 108 tickers in 10 sector rows', async ({ page }) => {
    await openReplay(page);
    await expect(page.locator('.sr-cell')).toHaveCount(108);
    await expect(page.locator('.sr-row')).toHaveCount(10);
  });

  test('catches the first spike and explains why it is a single-stock event, without any click', async ({ page }) => {
    await openReplay(page);
    const fig = page.locator('.spreplay');
    await expect(fig).toHaveAttribute('data-phase', 'detect', { timeout: 15_000 });
    await expect(page.locator('.sr-cell.is-headline')).toContainText('NVDA');
    await expect(fig).toHaveAttribute('data-phase', 'classify', { timeout: 10_000 });
    await expect(page.locator('.sr-title')).toContainText('개별 종목 이벤트');
  });

  test('pauses and resumes from one button', async ({ page }) => {
    await openReplay(page);
    await page.getByRole('button', { name: '일시정지' }).click();
    const before = await page.locator('.spreplay').innerText();
    await page.waitForTimeout(1500);
    expect(await page.locator('.spreplay').innerText()).toBe(before);
    await page.getByRole('button', { name: '재생' }).click();
    await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  });

  test('starts paused for visitors who ask for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openReplay(page);
    await expect(page.getByRole('button', { name: '재생' })).toBeVisible();
  });

  test('runs without policy violations or accessibility issues', async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = [];
      Object.defineProperty(window, '__csp', { value: seen });
      document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.effectiveDirective} ${e.blockedURI}`));
    });
    await openReplay(page);
    await expect(page.locator('.spreplay')).toHaveAttribute('data-phase', 'classify', { timeout: 20_000 });
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
    const result = await new AxeBuilder({ page }).include('#demo').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  test('speaks English on the English page', async ({ page }) => {
    await openReplay(page, '/en/projects/stockpulse/');
    await expect(page.locator('.spreplay')).toHaveAttribute('data-phase', 'classify', { timeout: 20_000 });
    await expect(page.locator('.sr-title')).toContainText('Single-stock event');
  });

  test('does not load the replay on the BARO page', async ({ page }) => {
    const chunks: string[] = [];
    page.on('request', (r) => {
      if (/SpReplay/.test(r.url())) chunks.push(r.url());
    });
    await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 204 }));
    await page.goto('/projects/baro/');
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    expect(chunks).toEqual([]);
  });
});
