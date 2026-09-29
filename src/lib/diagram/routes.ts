import type { Edge, RouteRef } from './types';

export interface Pt {
  x: number;
  y: number;
}

export interface Route {
  segments: { pts: Pt[]; len: number }[];
  total: number;
}

const COMMAND = /\s*([A-Za-z])\s*(-?\d*\.?\d+)\s*,?\s*(-?\d*\.?\d+)/y;

/** 'M x,y L x,y ...' 형식(절대 좌표 M/L)만 읽는다. 다른 명령이 있으면 예외를 던진다. */
export function parsePath(d: string): Pt[] {
  const s = d.trim();
  const pts: Pt[] = [];
  let i = 0;
  while (i < s.length) {
    COMMAND.lastIndex = i;
    const m = COMMAND.exec(s);
    if (!m) throw new Error(`Unsupported path syntax at ${i}: ${d}`);
    const cmd = m[1];
    if (cmd !== 'M' && cmd !== 'L') throw new Error(`Unsupported path command "${cmd}" in: ${d}`);
    if (cmd === 'M' && pts.length > 0) throw new Error(`Unsupported second M in: ${d}`);
    if (cmd === 'L' && pts.length === 0) throw new Error(`Path must start with M: ${d}`);
    pts.push({ x: Number(m[2]), y: Number(m[3]) });
    i = COMMAND.lastIndex;
    while (i < s.length && /\s/.test(s[i])) i += 1;
  }
  if (pts.length < 2) throw new Error(`Path needs at least two points: ${d}`);
  return pts;
}

export function polylineLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/** 시작점에서 dist만큼 떨어진 점. 범위를 벗어나면 양 끝점으로 고정한다. */
export function pointAt(pts: Pt[], dist: number): Pt {
  if (dist <= 0) return { ...pts[0] };
  let rest = dist;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= seg) {
      const k = seg === 0 ? 0 : rest / seg;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    rest -= seg;
  }
  return { ...pts[pts.length - 1] };
}

export function parseRef(ref: RouteRef): { id: string; reverse: boolean } {
  return ref.startsWith('-') ? { id: ref.slice(1), reverse: true } : { id: ref, reverse: false };
}

/** edge 참조를 이어 붙인 경로. 역방향 참조는 점 순서를 뒤집는다. */
export function buildRoute(refs: RouteRef[], edges: Map<string, Edge>): Route {
  if (refs.length === 0) throw new Error('Route is empty');
  const segments = refs.map((ref) => {
    const { id, reverse } = parseRef(ref);
    const edge = edges.get(id);
    if (!edge) throw new Error(`Unknown edge "${id}"`);
    const pts = parsePath(edge.d);
    const ordered = reverse ? [...pts].reverse() : pts;
    return { pts: ordered, len: polylineLength(ordered) };
  });
  return { segments, total: segments.reduce((sum, s) => sum + s.len, 0) };
}

/** 경로 전체 길이에 대한 비율 u(0~1) 위치. */
export function pointOnRoute(route: Route, u: number): Pt {
  let d = Math.min(1, Math.max(0, u)) * route.total;
  for (const s of route.segments) {
    if (d <= s.len) return pointAt(s.pts, d);
    d -= s.len;
  }
  const last = route.segments[route.segments.length - 1];
  return { ...last.pts[last.pts.length - 1] };
}

/** 한 바퀴 시간(ms): max(1200, 길이 × 4.2). */
export function routeDuration(route: Route): number {
  return Math.max(1200, route.total * 4.2);
}
