import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 테스트는 OSM 타일 서버에 기대지 않는다. 1×1 PNG로 대신 응답한다.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function openDemo(page: Page, path = '/projects/baro/') {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto(path);
  await page.locator('#demo').scrollIntoViewIfNeeded();
  await expect(page.locator('.barosim')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
}

const total = (page: Page) =>
  page.locator('.bs-count b').evaluateAll((els) => els.reduce((n, el) => n + Number((el.textContent ?? '').replace(/\D/g, '')), 0));

test.describe('BARO dispatch demo', () => {
  test('shows 1,500 cars on a map, credits OpenStreetMap and keeps the state counts whole', async ({ page }) => {
    await openDemo(page);
    await expect(page.locator('.barosim .leaflet-container')).toBeVisible();
    await expect(page.locator('.barosim .leaflet-control-attribution')).toContainText('OpenStreetMap');
    // Leaflet(BSD-2) 저작권 표기도 지도에 남긴다.
    await expect(page.locator('.barosim .leaflet-control-attribution')).toContainText('Leaflet');
    await expect.poll(() => total(page)).toBe(1500);
  });

  test('follows one ride through the dispatch steps without any click', async ({ page }) => {
    await openDemo(page);
    const fig = page.locator('.barosim');
    await expect(fig).toHaveAttribute('data-phase', 'call', { timeout: 15_000 });
    await expect(fig).toHaveAttribute('data-phase', 'search', { timeout: 10_000 });
    await expect(page.locator('.bs-text')).toContainText('가장 가까운 빈 차 10대');
    await expect(fig).toHaveAttribute('data-phase', 'reserve', { timeout: 10_000 });
    await expect(page.locator('.bs-text')).toContainText('가장 가까운 차');
  });

  test('pauses and resumes from one button', async ({ page }) => {
    await openDemo(page);
    await page.getByRole('button', { name: '일시정지' }).click();
    await expect(page.getByRole('button', { name: '재생' })).toBeVisible();
    const before = await page.locator('.bs-panel').innerText();
    await page.waitForTimeout(1500);
    expect(await page.locator('.bs-panel').innerText()).toBe(before);
    await page.getByRole('button', { name: '재생' }).click();
    await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  });

  test('freezes the camera and stops drawing while paused', async ({ page }) => {
    await page.addInitScript(() => {
      const draws = { n: 0 };
      Object.defineProperty(window, '__draws', { value: draws });
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (this: CanvasRenderingContext2D, ...args: [number, number, number, number]) {
        if (this.canvas.classList.contains('bs-canvas')) draws.n++;
        return clear.apply(this, args);
      };
    });
    const draws = () => page.evaluate(() => (window as unknown as { __draws: { n: number } }).__draws.n);
    const picture = () => page.locator('.bs-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await openDemo(page);
    // 호출 지점으로 카메라가 날아가는 도중에 멈춘다.
    await expect(page.locator('.barosim')).toHaveAttribute('data-phase', 'call', { timeout: 15_000 });
    await page.getByRole('button', { name: '일시정지' }).click();
    // 멈춘 직후 한 번 다시 그린 뒤로는 그림이 바뀌지 않아야 한다(줌을 맞추는 애니메이션이 늦게 다시 그리게 하면 안 된다).
    await page.waitForTimeout(60);
    const [before, count] = [await picture(), await draws()];
    await page.waitForTimeout(1500);
    expect(await picture()).toBe(before);
    expect(await draws()).toBe(count);
  });

  test('starts paused for visitors who ask for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDemo(page);
    await expect(page.getByRole('button', { name: '재생' })).toBeVisible();
  });

  test('tones the map tiles for each theme', async ({ page }) => {
    await openDemo(page);
    await expect(page.locator('.barosim .leaflet-tile-pane')).toHaveCSS('filter', /grayscale/);
    await page.locator('.theme-toggle').first().click();
    await expect(page.locator('.barosim .leaflet-tile-pane')).toHaveCSS('filter', /invert/);
  });

  test('runs without content security policy violations', async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = [];
      Object.defineProperty(window, '__csp', { value: seen });
      document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.effectiveDirective} ${e.blockedURI}`));
    });
    await openDemo(page);
    // 차 위에 마우스를 올려 툴팁(위치를 style로 정하는 요소)까지 띄운다.
    const canvas = page.locator('.bs-canvas');
    const box = (await canvas.boundingBox())!;
    let shown = false;
    for (let y = box.height * 0.3; y < box.height * 0.7 && !shown; y += 10) {
      for (let x = box.width * 0.3; x < box.width * 0.7 && !shown; x += 10) {
        await canvas.hover({ position: { x, y } });
        shown = await page.locator('.bs-tip').isVisible();
      }
    }
    expect(shown).toBe(true);
    await expect(page.locator('.barosim')).toHaveAttribute('data-phase', 'reserve', { timeout: 25_000 });
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  });

  test('has no accessibility violations once the map is loaded', async ({ page }) => {
    await openDemo(page);
    const result = await new AxeBuilder({ page }).include('#demo').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  test('does not start and abort tile downloads while the camera flies', async ({ page }) => {
    const aborted: string[] = [];
    page.on('requestfailed', (r) => {
      if (r.url().startsWith('https://tile.openstreetmap.org/')) aborted.push(r.url());
    });
    await openDemo(page);
    // 느린 타일 서버를 흉내 낸다. 카메라가 움직이는 도중에 받기 시작하면 다음 이동에서 취소된다.
    await page.route('https://tile.openstreetmap.org/**', async (route) => {
      await new Promise((r) => setTimeout(r, 250));
      await route.fulfill({ contentType: 'image/png', body: PNG }).catch(() => {});
    });
    await page.waitForTimeout(15_000);
    expect(aborted).toEqual([]);
  });

  test('speaks English on the English page', async ({ page }) => {
    await openDemo(page, '/en/projects/baro/');
    await expect(page.locator('.bs-panel')).toContainText('Picking up');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('loads no map on the StockPulse page', async ({ page }) => {
    const mapRequests: string[] = [];
    page.on('request', (r) => {
      if (/leaflet|tile\.openstreetmap/.test(r.url())) mapRequests.push(r.url());
    });
    await page.goto('/projects/stockpulse/');
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    expect(mapRequests).toEqual([]);
  });
});
