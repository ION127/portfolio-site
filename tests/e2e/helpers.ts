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

/** 아키텍처 섹션을 화면에 올려 섬이 로딩(ssr 속성 제거)될 때까지 기다린다. */
export async function waitForScrolly(page: Page): Promise<void> {
  await page.locator('#architecture').scrollIntoViewIfNeeded();
  await page.locator('astro-island:not([ssr]) .scrolly').waitFor();
}

/** i번째 단계 문단의 top이 뷰포트 45% 지점에 오도록 즉시 스크롤한다(좌우 기준선 55%, 상하 기준선보다 위). */
export async function scrollToStep(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => {
    const card = document.querySelectorAll<HTMLElement>('.scard')[i];
    if (!card) throw new Error(`no step ${i}`);
    const top = card.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * 0.45, behavior: 'instant' });
  }, index);
}
