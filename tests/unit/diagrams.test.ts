import { describe, expect, it } from 'vitest';
import { baro } from '../../src/diagrams/baro';
import { validateSpec } from '../../src/lib/diagram/validate';
import { formatView, targetView } from '../../src/lib/diagram/view';
import { parseRef } from '../../src/lib/diagram/routes';
import type { DiagramSpec } from '../../src/lib/diagram/types';

function usedEdges(spec: DiagramSpec) {
  return new Set(spec.steps.flatMap((s) => s.routes.flat().map((r) => parseRef(r).id)));
}
function usedShapes(spec: DiagramSpec) {
  return new Set(spec.steps.flatMap((s) => s.nodes));
}

describe('BARO diagram data', () => {
  it('is internally consistent', () => {
    expect(validateSpec(baro)).toEqual([]);
  });

  it('has 6 chapters, 13 steps and 20 nodes', () => {
    expect(baro.chapters).toHaveLength(6);
    expect(baro.steps).toHaveLength(13);
    expect(baro.nodes).toHaveLength(20);
  });

  it('uses every edge and every shape in at least one step', () => {
    const edges = usedEdges(baro);
    for (const e of baro.edges) expect(edges.has(e.id), e.id).toBe(true);
    const shapes = usedShapes(baro);
    for (const id of [...baro.nodes.map((n) => n.id), ...baro.tunnels.map((t) => t.id)]) {
      expect(shapes.has(id), id).toBe(true);
    }
  });

  it('opens with an overview step that focuses nothing', () => {
    expect(baro.steps[0].nodes).toEqual([]);
    expect(targetView(baro, baro.steps[0], false)).toEqual([0, 0, 1100, 580]);
  });

  it('zooms the dispatch-lock step to the same box as the approved prototype', () => {
    expect(formatView(targetView(baro, baro.steps[5], false))).toBe('137.50 0.00 770.00 406.00');
  });
});
