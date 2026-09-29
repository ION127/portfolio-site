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

test('the skip link targets the main content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
  await expect(page.locator('main#main')).toHaveCount(1);
});
