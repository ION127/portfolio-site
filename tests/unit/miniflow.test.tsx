import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import MiniFlow from '../../src/islands/MiniFlow';
import { MINI_H, MINI_SCENES, MINI_W } from '../../src/diagrams/mini';
import { MINI_SCENE_IDS } from '../../src/diagrams/ids';
import { parsePath } from '../../src/lib/diagram/routes';

describe('mini scenes', () => {
  it('defines every scene id with drawable paths inside the canvas and full translations', () => {
    for (const id of MINI_SCENE_IDS) {
      const scene = MINI_SCENES[id];
      expect(scene.id).toBe(id);
      for (const d of [...scene.edges, ...scene.dashed, ...scene.routes]) {
        for (const p of parsePath(d)) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(MINI_W);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(MINI_H);
        }
      }
      for (const node of scene.nodes) {
        for (const text of [node.title.ko, node.title.en, node.sub.ko, node.sub.en]) expect(text).not.toBe('');
      }
    }
  });
});

describe('MiniFlow server render', () => {
  it('shows the first scene and hides the rest in auto mode', () => {
    const html = renderToString(
      <MiniFlow scenes={['baro-telemetry', 'stockpulse-anomaly']} locale="ko" mode="auto" caption="캡션" />,
    );
    expect(html).toContain('BARO · 차량 위치 흐름');
    expect(html).toMatch(/data-scene="0"[^>]*style="opacity:1"/);
    expect(html).toMatch(/data-scene="1"[^>]*style="opacity:0"/);
    expect(html).toContain('캡션');
  });

  it('renders a static single scene without a header', () => {
    const html = renderToString(<MiniFlow scenes={['baro-cicd']} locale="en" mode="static" />);
    expect(html).toContain('Build · test');
    expect(html).not.toContain('mf-head');
  });
});
