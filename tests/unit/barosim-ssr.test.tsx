import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import BaroSim from '../../src/islands/BaroSim';
import { DEFAULTS } from '../../src/lib/baro-sim/engine';

const fleet = DEFAULTS.vehicleCount.toLocaleString('en-US');

describe('BaroSim server render', () => {
  it('renders the panel, the note and a description without inline styles', () => {
    const html = renderToString(<BaroSim locale="ko" />);
    expect(html).toContain('class="barosim"');
    expect(html).toContain('실제 서비스의 배차 규칙');
    expect(html).toContain(`지도 위 차량 ${fleet}대가 움직이고`);
    expect(html).toContain('—');
    expect(html).not.toContain('style=');
  });

  it('speaks English on the English page', () => {
    const html = renderToString(<BaroSim locale="en" />);
    expect(html).toContain('Picking up');
    expect(html).toContain('dispatch rules');
    expect(html).toContain(`${fleet} cars move on a map`);
  });
});
