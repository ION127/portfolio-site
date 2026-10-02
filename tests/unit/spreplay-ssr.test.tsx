import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import SpReplay from '../../src/islands/SpReplay';
import { t } from '../../src/i18n';

describe('SpReplay server render', () => {
  it('renders all 108 tiles, the pipeline and the note without inline styles', () => {
    const html = renderToString(<SpReplay locale="ko" />);
    expect(html.match(/class="sr-cell/g)).toHaveLength(108);
    expect(html).toContain('stock.raw.us');
    expect(html).toContain('news.fetched.dlq');
    expect(html).toContain('시세, 뉴스, AI 분석 문장은 예시입니다');
    expect(html).not.toContain('style=');
  });

  it('describes the Groq 429 handling the way the analyzer does it', () => {
    // 429는 안내된 시간만큼 기다렸다 다시 부르고, 서킷브레이커가 열렸을 때만 DLQ에 남는다.
    expect(t('ko', 'replay.retry')).toMatch(/429.*기다렸다 다시.*서킷브레이커.*news\.fetched\.dlq/);
    expect(t('en', 'replay.retry')).toMatch(/429.*waits.*circuit breaker.*news\.fetched\.dlq/);
    // DLQ 갈래는 AI 분석에서 나가기만 한다(자동으로 돌아오는 길이 없다).
    expect(renderToString(<SpReplay locale="ko" />)).toContain('d="M140,235 L244,235 L244,215"');
  });

  it('speaks English and uses the English colour convention class', () => {
    const html = renderToString(<SpReplay locale="en" />);
    expect(html).toContain('spreplay is-en');
    expect(html).toContain('Prices, news and AI analysis are examples');
  });
});
