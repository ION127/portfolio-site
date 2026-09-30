import { expect, test, type Page } from '@playwright/test';
import { waitForScrolly } from './helpers';

const PAGES = ['/', '/en/', '/projects/baro/', '/projects/stockpulse/', '/en/projects/baro/', '/en/projects/stockpulse/', '/404.html'];

// 브라우저가 정책 때문에 막은 스크립트·스타일을 모은다. 콘솔 문구보다 이 이벤트가 확실하다.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__csp', { value: seen });
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
});

const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

for (const path of PAGES) {
  test(`${path} ships a strict content security policy`, async ({ page }) => {
    await page.goto(path);
    const policy = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
    for (const rule of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(policy).toContain(rule);
    }
    expect(policy).toMatch(/script-src 'self'[^;]*'sha256-/);
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
}

test('the Pretendard stylesheet switches to screen media once it loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="stylesheet"][href*="pretendard"]')).toHaveAttribute('media', 'all');
});

test('the home pages run without policy violations, including the theme toggle and the mini diagrams', async ({ page }) => {
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    await page.locator('.theme-toggle').first().click();
    await expect(page.locator('.mode-auto [data-scene="1"]').first()).toHaveCSS('opacity', '1', { timeout: 8000 });
    expect(await violations(page)).toEqual([]);
  }
});

test('the project pages run without policy violations, including the diagram and its tooltip', async ({ page }) => {
  for (const path of ['/projects/baro/', '/en/projects/stockpulse/']) {
    await page.goto(path);
    await waitForScrolly(page);
    await page.locator('.arch [data-node]').first().hover();
    await expect(page.locator('.sd-tip')).toBeVisible();
    expect(await violations(page)).toEqual([]);
  }
});
