import { NODE_H, NODE_W, type DiagramSpec, type Rect, type Step, type ViewBox } from './types';
import { boxFor, fullView, MIN_WIDTH_RATIO } from './camera';

/** 노드 또는 터널의 사각형. 없으면 null. */
export function rectOf(spec: DiagramSpec, id: string): Rect | null {
  const n = spec.nodes.find((node) => node.id === id);
  if (n) return { x: n.x, y: n.y, w: n.w ?? NODE_W, h: n.h ?? NODE_H };
  const t = spec.tunnels.find((tunnel) => tunnel.id === id);
  return t ? { x: t.x, y: t.y, w: t.w, h: t.h } : null;
}

/** 단계가 보여줄 viewBox. full이거나 강조 노드가 없으면 전체 보기. */
export function targetView(spec: DiagramSpec, step: Step, stacked: boolean): ViewBox {
  if (step.full || step.nodes.length === 0) return fullView(spec.width, spec.height);
  const rects = step.nodes.map((id) => rectOf(spec, id)).filter((r): r is Rect => r !== null);
  return boxFor(rects, {
    width: spec.width,
    height: spec.height,
    minWidthRatio: stacked ? MIN_WIDTH_RATIO.stacked : MIN_WIDTH_RATIO.side,
  });
}

export function formatView(v: ViewBox): string {
  return v.map((n) => n.toFixed(2)).join(' ');
}
