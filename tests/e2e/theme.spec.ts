import { expect, test } from '@playwright/test';

test.describe('theme', () => {
  test('follows the OS preference on the first visit', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the toggle switches the theme and survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('.theme-toggle').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('in dark mode the toggle offers light mode even before its script runs', async ({ page }) => {
    // 토글 스크립트만 빼고 받는다. 머리의 테마 스크립트는 그대로라 data-theme은 dark가 된다.
    let removed = 0;
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      const body = (await response.text()).replace(/<script type="module">(?:(?!<\/script>)[\s\S])*?<\/script>/g, (s) => {
        if (!s.includes('theme-toggle')) return s;
        removed += 1;
        return '';
      });
      await route.fulfill({ response, body });
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(removed).toBe(1);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const toggle = page.locator('.theme-toggle').first();
    await expect(toggle).toHaveAccessibleName('라이트 모드로 전환');
    await expect(toggle.locator('.icon:visible')).toHaveText('☀');
  });

  test('ignores an invalid stored value and falls back to the OS preference', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'blue'));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('keeps working when storage access throws', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage blocked');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('.theme-toggle').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
});
