import { NODE_H, NODE_W, type DiagramSpec, type Rect } from './types';
import { buildRoute, parsePath, parseRef, type Pt } from './routes';

const LOCALES = ['ko', 'en'] as const;
/** 이음매 허용 오차. 좌표를 손으로 적으므로 2 단위까지 어긋나도 같은 자리로 본다. */
const JOIN_TOLERANCE = 2;

/** 다이어그램 데이터의 일관성 오류 목록. 비어 있으면 정상이다. */
export function validateSpec(spec: DiagramSpec): string[] {
  const errors: string[] = [];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x <= spec.width && y <= spec.height;

  const shapeIds = new Set<string>();
  for (const n of spec.nodes) {
    if (shapeIds.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
    shapeIds.add(n.id);
  }
  for (const t of spec.tunnels) {
    if (shapeIds.has(t.id)) errors.push(`duplicate tunnel id: ${t.id}`);
    shapeIds.add(t.id);
  }
  const edgeIds = new Set<string>();
  for (const e of spec.edges) {
    if (edgeIds.has(e.id)) errors.push(`duplicate edge id: ${e.id}`);
    edgeIds.add(e.id);
  }

  for (const n of spec.nodes) {
    const w = n.w ?? NODE_W;
    const h = n.h ?? NODE_H;
    if (!inside(n.x, n.y) || !inside(n.x + w, n.y + h)) errors.push(`node ${n.id} is outside the canvas`);
    for (const loc of LOCALES) {
      if (!n.title[loc]) errors.push(`node ${n.id} missing title.${loc}`);
      if (!n.sub[loc]) errors.push(`node ${n.id} missing sub.${loc}`);
      if (n.tip && !n.tip.desc[loc]) errors.push(`node ${n.id} missing tip.desc.${loc}`);
    }
  }
  for (const t of spec.tunnels) {
    if (!inside(t.x, t.y) || !inside(t.x + t.w, t.y + t.h)) errors.push(`tunnel ${t.id} is outside the canvas`);
  }
  for (const e of spec.edges) {
    try {
      if (parsePath(e.d).some((p) => !inside(p.x, p.y))) errors.push(`edge ${e.id} leaves the canvas`);
    } catch (err) {
      errors.push(`edge ${e.id}: ${(err as Error).message}`);
    }
  }
  for (const z of spec.zones) {
    for (const loc of LOCALES) if (!z.label[loc]) errors.push(`zone ${z.id} missing label.${loc}`);
  }
  spec.chapters.forEach((c, i) => {
    for (const loc of LOCALES) if (!c[loc]) errors.push(`chapter ${i} missing ${loc}`);
  });
  // 경로의 이음매: 앞 edge의 끝점과 다음 edge의 시작점이 같거나, 둘 다 같은 노드·터널 위에 있어야 한다(그 도형을 지나감).
  // 그렇지 않으면 흐르는 점이 순간이동한다.
  const shapes: Rect[] = [
    ...spec.nodes.map((n) => ({ x: n.x, y: n.y, w: n.w ?? NODE_W, h: n.h ?? NODE_H })),
    ...spec.tunnels.map((t) => ({ x: t.x, y: t.y, w: t.w, h: t.h })),
  ];
  const onShape = (p: Pt, r: Rect) =>
    p.x >= r.x - JOIN_TOLERANCE &&
    p.x <= r.x + r.w + JOIN_TOLERANCE &&
    p.y >= r.y - JOIN_TOLERANCE &&
    p.y <= r.y + r.h + JOIN_TOLERANCE;
  const joins = (a: Pt, b: Pt) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= JOIN_TOLERANCE || shapes.some((r) => onShape(a, r) && onShape(b, r));
  const edgesById = new Map(spec.edges.map((e) => [e.id, e]));

  if (spec.steps.length === 0) errors.push('spec has no steps');
  spec.steps.forEach((s, i) => {
    if (!Number.isInteger(s.chapter) || s.chapter < 0 || s.chapter >= spec.chapters.length) {
      errors.push(`step ${i} has invalid chapter ${s.chapter}`);
    }
    for (const loc of LOCALES) if (!s.text[loc]) errors.push(`step ${i} missing text.${loc}`);
    for (const id of s.nodes) if (!shapeIds.has(id)) errors.push(`step ${i} references unknown node ${id}`);
    s.routes.forEach((route, r) => {
      if (route.length === 0) errors.push(`step ${i} route ${r} is empty`);
      for (const ref of route) {
        const { id } = parseRef(ref);
        if (!edgeIds.has(id)) errors.push(`step ${i} references unknown edge ${id}`);
      }
      let segments: { pts: Pt[] }[];
      try {
        segments = buildRoute(route, edgesById).segments;
      } catch {
        return; // 빈 경로·없는 edge·읽을 수 없는 경로는 위에서 이미 보고했다.
      }
      for (let k = 1; k < segments.length; k += 1) {
        const prev = segments[k - 1].pts;
        if (!joins(prev[prev.length - 1], segments[k].pts[0])) {
          errors.push(`step ${i} route ${r} breaks between ${route[k - 1]} and ${route[k]}`);
        }
      }
    });
  });
  return errors;
}
