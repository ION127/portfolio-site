// OpenStreetMap(Overpass) 원본을 데모용 도로 그래프로 줄인다. 빌드 스크립트(scripts/build-roads.mjs)와 테스트가 쓴다.
// Node가 타입만 지우고 바로 실행할 수 있도록 다른 모듈을 import하지 않는다.

export interface OsmNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

export interface OsmWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export type OsmElement = OsmNode | OsmWay;

export interface RoadData {
  version: 1;
  attribution: string;
  /** 좌표에 곱해 정수로 저장한 값 */
  scale: number;
  /** 교차로 [위도, 경도] × scale. 첫 교차로는 절대값, 이후는 앞 교차로와의 차이 */
  nodes: number[];
  /** 간선 [a, b, flags] 묶음. flags: 1 = a → b로만 가는 일방통행, 2 = 자동차 전용(motorway · trunk와 각 진입로) */
  edges: number[];
  /** 간선마다 a와 b 사이 점들. 앞 점(처음은 a)과의 차이로 저장한다 */
  geometry: number[][];
}

export interface BuildOptions {
  /** 간선 모양 단순화 허용 오차(m) */
  tolerance?: number;
  scale?: number;
  attribution?: string;
}

export interface BuildStats {
  ways: number;
  nodes: number;
  edges: number;
  points: number;
  /** 가장 큰 강연결 성분 밖이라 뺀 교차로 수 */
  dropped: number;
}

type Pt = [number, number];

const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
const FAST_CLASSES = new Set(['motorway', 'trunk']);
const RAD = Math.PI / 180;
// 서울 위도의 1도당 미터(평면 근사, 단순화에만 쓴다)
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320 * Math.cos(37.55 * RAD);

export const isRoad = (highway: string | undefined): boolean =>
  highway !== undefined && ROAD_CLASSES.has(highway.replace(/_link$/, ''));

/** 자동차 전용 도로. 출발 · 도착점을 이런 길에만 걸린 교차로에 붙이면 멀리 돌아가게 된다. */
export const isFast = (highway: string | undefined): boolean =>
  highway !== undefined && FAST_CLASSES.has(highway.replace(/_link$/, ''));

/** 1: 길 방향으로만, -1: 반대로만, 0: 양방향 */
export function direction(tags: Record<string, string>): -1 | 0 | 1 {
  const oneway = tags.oneway;
  if (oneway === 'no') return 0;
  if (oneway === '-1') return -1;
  if (oneway === 'yes' || oneway === '1' || oneway === 'true') return 1;
  if (tags.junction === 'roundabout' || tags.highway === 'motorway') return 1;
  return 0;
}

/** Douglas–Peucker 단순화(평면 근사). 처음과 끝 점은 남긴다. */
export function simplify(points: readonly Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const xy = points.map(([lat, lng]) => [lng * M_PER_DEG_LNG, lat * M_PER_DEG_LAT] as const);
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    const [ax, ay] = xy[i]!;
    const [bx, by] = xy[j]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1;
    let bestD = 0;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = xy[k]!;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best >= 0 && bestD > tolerance) {
      keep[best] = 1;
      stack.push([i, best], [best, j]);
    }
  }
  return points.filter((_, k) => keep[k] === 1);
}

interface RawEdge {
  a: number;
  b: number;
  oneway: 0 | 1;
  fast: 0 | 1;
  points: Pt[];
}

/** 가장 큰 강연결 성분에 든 노드 표시(Kosaraju, 재귀 없이). */
function largestStrongComponent(nodeCount: number, edges: readonly RawEdge[]): Uint8Array {
  const out: number[][] = Array.from({ length: nodeCount }, () => []);
  const inn: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const e of edges) {
    out[e.a]!.push(e.b);
    inn[e.b]!.push(e.a);
    if (e.oneway === 0) {
      out[e.b]!.push(e.a);
      inn[e.a]!.push(e.b);
    }
  }
  const seen = new Uint8Array(nodeCount);
  const order: number[] = [];
  for (let s = 0; s < nodeCount; s++) {
    if (seen[s]) continue;
    seen[s] = 1;
    const stack: [number, number][] = [[s, 0]];
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const next = out[top[0]]!;
      if (top[1] < next.length) {
        const v = next[top[1]++]!;
        if (!seen[v]) {
          seen[v] = 1;
          stack.push([v, 0]);
        }
      } else {
        order.push(top[0]);
        stack.pop();
      }
    }
  }
  const comp = new Int32Array(nodeCount).fill(-1);
  const sizes: number[] = [];
  for (let k = order.length - 1; k >= 0; k--) {
    const s = order[k]!;
    if (comp[s] !== -1) continue;
    const c = sizes.length;
    let size = 0;
    const stack = [s];
    comp[s] = c;
    while (stack.length > 0) {
      const u = stack.pop()!;
      size++;
      for (const v of inn[u]!) {
        if (comp[v] === -1) {
          comp[v] = c;
          stack.push(v);
        }
      }
    }
    sizes.push(size);
  }
  let biggest = 0;
  for (let c = 1; c < sizes.length; c++) if (sizes[c]! > sizes[biggest]!) biggest = c;
  const inBig = new Uint8Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) if (comp[i] === biggest) inBig[i] = 1;
  return inBig;
}

export function buildRoadGraph(elements: readonly OsmElement[], options: BuildOptions = {}): { data: RoadData; stats: BuildStats } {
  const tolerance = options.tolerance ?? 5;
  const scale = options.scale ?? 100_000;
  const q = (v: number) => Math.round(v * scale);
  const coord = new Map<number, Pt>();
  const ways: OsmWay[] = [];
  for (const e of elements) {
    if (e.type === 'node') coord.set(e.id, [e.lat, e.lon]);
    else if (isRoad(e.tags?.highway)) ways.push(e);
  }
  // 교차로: 둘 이상의 길이 지나거나 길의 끝인 점(끝점은 2로 센다)
  const uses = new Map<number, number>();
  for (const w of ways) {
    w.nodes.forEach((id, i) => {
      const end = i === 0 || i === w.nodes.length - 1;
      uses.set(id, (uses.get(id) ?? 0) + (end ? 2 : 1));
    });
  }
  const index = new Map<number, number>();
  const ids: number[] = [];
  const nodeOf = (osmId: number): number => {
    let i = index.get(osmId);
    if (i === undefined) {
      i = ids.length;
      index.set(osmId, i);
      ids.push(osmId);
    }
    return i;
  };
  const raw: RawEdge[] = [];
  for (const w of ways) {
    if (w.nodes.length < 2 || w.nodes.some((id) => !coord.has(id))) continue;
    const dir = direction(w.tags ?? {});
    const fast = isFast(w.tags?.highway) ? 1 : 0;
    let start = 0;
    for (let i = 1; i < w.nodes.length; i++) {
      if (i < w.nodes.length - 1 && uses.get(w.nodes[i]!) === 1) continue;
      const seg = w.nodes.slice(start, i + 1);
      start = i;
      if (seg[0] === seg[seg.length - 1]) continue; // 교차로 없이 제자리로 돌아오는 고리
      let points = seg.map((id) => coord.get(id)!);
      let a = nodeOf(seg[0]!);
      let b = nodeOf(seg[seg.length - 1]!);
      if (dir === -1) {
        [a, b] = [b, a];
        points = points.reverse();
      }
      raw.push({ a, b, oneway: dir === 0 ? 0 : 1, fast, points });
    }
  }
  const inBig = largestStrongComponent(ids.length, raw);
  const kept = raw.filter((e) => inBig[e.a] === 1 && inBig[e.b] === 1);
  // 쓰는 교차로만 위도 · 경도 순으로 다시 번호를 매긴다(차이값이 작아져 압축이 잘 된다)
  const used = [...new Set(kept.flatMap((e) => [e.a, e.b]))];
  const at = (n: number) => coord.get(ids[n]!)!;
  used.sort((x, y) => q(at(x)[0]) - q(at(y)[0]) || q(at(x)[1]) - q(at(y)[1]));
  const renumber = new Map(used.map((n, i) => [n, i]));
  const nodes: number[] = [];
  let py = 0;
  let px = 0;
  for (const n of used) {
    const y = q(at(n)[0]);
    const x = q(at(n)[1]);
    nodes.push(y - py, x - px);
    py = y;
    px = x;
  }
  const edges: number[] = [];
  const geometry: number[][] = [];
  let points = 0;
  for (const e of kept) {
    edges.push(renumber.get(e.a)!, renumber.get(e.b)!, e.oneway | (e.fast << 1));
    const inner = simplify(e.points, tolerance).slice(1, -1);
    const g: number[] = [];
    let ly = q(e.points[0]![0]);
    let lx = q(e.points[0]![1]);
    for (const [lat, lng] of inner) {
      const y = q(lat);
      const x = q(lng);
      g.push(y - ly, x - lx);
      ly = y;
      lx = x;
    }
    geometry.push(g);
    points += inner.length;
  }
  return {
    data: {
      version: 1,
      attribution: options.attribution ?? '© OpenStreetMap contributors, ODbL 1.0',
      scale,
      nodes,
      edges,
      geometry,
    },
    stats: { ways: ways.length, nodes: used.length, edges: kept.length, points, dropped: ids.length - used.length },
  };
}
