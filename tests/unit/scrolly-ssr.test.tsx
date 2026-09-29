import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ScrollyDiagram from '../../src/islands/ScrollyDiagram';
import { baro } from '../../src/diagrams/baro';

describe('ScrollyDiagram server render', () => {
  it('renders every node and every step so the page reads without JavaScript', () => {
    const html = renderToString(<ScrollyDiagram diagram="baro" locale="ko" />);
    expect(html.match(/data-node="/g)).toHaveLength(baro.nodes.length);
    expect(html.match(/data-step="/g)).toHaveLength(baro.steps.length);
    expect(html).toContain('공유 구독');
    expect(html).toContain(`viewBox="0 0 ${baro.width} ${baro.height}"`);
  });

  it('renders English text for the en locale', () => {
    const html = renderToString(<ScrollyDiagram diagram="baro" locale="en" />);
    expect(html).toContain('shared subscription');
    expect(html).not.toContain('공유 구독');
  });

  it('marks the first step active and focuses nothing before any scrolling', () => {
    const html = renderToString(<ScrollyDiagram diagram="baro" locale="ko" />);
    expect(html).toMatch(/class="scard act[^"]*" data-step="0"/);
    expect(html).not.toContain('arch focus');
  });
});
