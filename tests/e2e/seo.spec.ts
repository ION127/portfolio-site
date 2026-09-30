import { expect, test } from '@playwright/test';

test('home carries canonical, language alternates and Open Graph tags', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:4321/');
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', 'http://localhost:4321/en/');
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', 'http://localhost:4321/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'http://localhost:4321/og-ko.png');
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ko_KR');
});

test('English case studies point to English assets and back to Korean', async ({ page }) => {
  await page.goto('/en/projects/baro/');
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'http://localhost:4321/og-en.png');
  await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute('href', 'http://localhost:4321/projects/baro/');
});

test('unknown pages answer 404 in both languages and stay out of the index', async ({ page }) => {
  const res = await page.goto('/does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('페이지를 찾을 수 없어요');
  await expect(page.locator('main')).toContainText('Page not found');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('.lang')).toHaveCount(0);
});

test('robots.txt, the sitemap and both OG images are published', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: http://localhost:4321/sitemap-index.xml');
  expect((await request.get('/sitemap-index.xml')).ok()).toBe(true);
  expect((await request.get('/og-ko.png')).ok()).toBe(true);
  expect((await request.get('/og-en.png')).ok()).toBe(true);
});
