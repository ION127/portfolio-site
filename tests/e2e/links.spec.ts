import { expect, test } from '@playwright/test';

const START = ['/', '/en/', '/projects/baro/', '/projects/stockpulse/', '/en/projects/baro/', '/en/projects/stockpulse/'];

test('every internal link resolves and every anchor exists', async ({ page, request }) => {
  const checked = new Set<string>();
  for (const start of START) {
    await page.goto(start);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const url = new URL(href, `http://localhost:4321${start}`);
      const key = `${url.pathname}${url.hash}`;
      if (checked.has(key)) continue;
      checked.add(key);
      const res = await request.get(url.pathname);
      expect(res.status(), `${start} → ${href}`).toBe(200);
      if (url.hash) {
        const html = await res.text();
        expect(html, `${start} → ${href}`).toContain(`id="${decodeURIComponent(url.hash.slice(1))}"`);
      }
    }
  }
  expect(checked.size).toBeGreaterThan(20);
});
