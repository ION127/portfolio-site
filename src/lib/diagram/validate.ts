import { NODE_H, NODE_W, type DiagramSpec } from './types';
import { parsePath, parseRef } from './routes';

const LOCALES = ['ko', 'en'] as const;

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
    });
  });
  return errors;
}
