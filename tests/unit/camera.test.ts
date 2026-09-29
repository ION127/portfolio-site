import { describe, expect, it } from 'vitest';
import { boxFor, fullView, lerpView, MIN_WIDTH_RATIO } from '../../src/lib/diagram/camera';
import type { ViewBox } from '../../src/lib/diagram/types';

const OPTS = { width: 1100, height: 580, minWidthRatio: MIN_WIDTH_RATIO.side };

function expectClose(actual: ViewBox, expected: ViewBox) {
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 1));
}

describe('boxFor', () => {
  it('shows everything when nothing is focused', () => {
    expect(boxFor([], OPTS)).toEqual(fullView(1100, 580));
  });

  it('widens a small cluster to 70% width, keeps the aspect ratio and clamps to the top', () => {
    // BARO 배차 단계: dispatch · valkey · rds (확정 프로토타입과 같은 결과)
    const rects = [
      { x: 380, y: 200, w: 130, h: 46 },
      { x: 535, y: 110, w: 130, h: 46 },
      { x: 535, y: 200, w: 130, h: 46 },
    ];
    expectClose(boxFor(rects, OPTS), [137.5, 0, 770, 406]);
  });

  it('clamps to the right and bottom edges', () => {
    expectClose(boxFor([{ x: 915, y: 470, w: 160, h: 46 }], OPTS), [330, 174, 770, 406]);
  });

  it('falls back to the full view when the focus is taller than the canvas allows', () => {
    const rects = [
      { x: 25, y: 12, w: 150, h: 46 },
      { x: 25, y: 470, w: 150, h: 46 },
      { x: 690, y: 200, w: 130, h: 46 },
    ];
    expect(boxFor(rects, OPTS)).toEqual([0, 0, 1100, 580]);
  });

  it('allows a tighter zoom in the stacked layout', () => {
    const stacked = { ...OPTS, minWidthRatio: MIN_WIDTH_RATIO.stacked };
    expectClose(boxFor([{ x: 380, y: 200, w: 130, h: 46 }], stacked), [197.5, 86.5, 495, 261]);
  });
});

describe('lerpView', () => {
  const a: ViewBox = [0, 0, 100, 50];
  const b: ViewBox = [100, 50, 200, 100];

  it('starts at the source, ends at the target and eases through the midpoint', () => {
    expect(lerpView(a, b, 0)).toEqual(a);
    expect(lerpView(a, b, 1)).toEqual(b);
    expect(lerpView(a, b, 0.5)).toEqual([50, 25, 150, 75]);
    expect(lerpView(a, b, 0.25)[0]).toBeCloseTo(12.5); // ease-in: 2 × 0.25² = 0.125
  });

  it('clamps t outside 0–1', () => {
    expect(lerpView(a, b, -0.2)).toEqual(a);
    expect(lerpView(a, b, 1.3)).toEqual(b);
  });
});
