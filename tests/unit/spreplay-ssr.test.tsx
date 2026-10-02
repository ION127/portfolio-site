import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import SpReplay from '../../src/islands/SpReplay';

describe('SpReplay server render', () => {
  it('renders all 108 tiles, the pipeline and the note without inline styles', () => {
    const html = renderToString(<SpReplay locale="ko" />);
    expect(html.match(/class="sr-cell/g)).toHaveLength(108);
    expect(html).toContain('stock.raw.us');
    expect(html).toContain('news.fetched.dlq');
    expect(html).toContain('시세, 뉴스, AI 분석 문장은 예시입니다');
    expect(html).not.toContain('style=');
  });

  it('speaks English and uses the English colour convention class', () => {
    const html = renderToString(<SpReplay locale="en" />);
    expect(html).toContain('spreplay is-en');
    expect(html).toContain('Prices, news and AI analysis are examples');
  });
});
