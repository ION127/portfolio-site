import type { Page } from '@playwright/test';

/** 페이지 에러와 console.error를 모은다. 테스트 끝에서 빈 배열인지 확인한다. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
