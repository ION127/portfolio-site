import { expect, test } from '@playwright/test';

test('home: the language toggle goes to the other language and back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: '한국어' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test('switching language keeps the section picked from the table of contents', async ({ page }) => {
  await page.goto('/projects/baro/');
  await page.locator('.toc a[data-toc="infra"]').click();
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL('/en/projects/baro/#infra');
});

test('switching language from the top of a page adds no section', async ({ page }) => {
  await page.goto('/projects/baro/');
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL('/en/projects/baro/');
});

test('the skip link targets the main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
  await expect(page.locator('main#main')).toHaveCount(1);
});

test('a case study toggles to the same project in the other language', async ({ page }) => {
  await page.goto('/en/projects/stockpulse/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#architecture')).toContainText('ETFs act as sector thermometers');
  await page.getByRole('link', { name: '한국어' }).click();
  await expect(page).toHaveURL('/projects/stockpulse/');
  await expect(page.locator('#architecture')).toContainText('ETF를 섹터 체온계로 써요');
});

test('the English home shows English content and English links', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('h1')).toContainText('I design and run services');
  await expect(page.locator('#ops .incident')).toHaveCount(3);
  await expect(page.locator('#projects .card h3 a').first()).toHaveAttribute('href', '/en/projects/baro/');
  await expect(page.locator('#ops .incident h3 a').first()).toHaveAttribute('href', '/en/projects/baro/#incident-baro-kafka-block');
});
