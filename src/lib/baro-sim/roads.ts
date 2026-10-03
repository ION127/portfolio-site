import { haversineMeters, type LatLng } from './geo';
import type { RoadData } from './roadbuild';

/** 도로망 길찾기. 데이터는 OpenStreetMap(ODbL)으로 만든 src/data/seoul-roads.json이다. */
export interface RoadNetwork {
  readonly nodeCount: number;
  readonly attribution: string;
  nodePos(i: number): LatLng;
  /** 일반 도로가 닿는 교차로 중 p에서 가장 가까운 곳 */
  nearestNode(p: LatLng): number;
  /** from에서 to까지 도로를 따라가는 지점 목록(from은 빼고 to는 넣는다). 교차로끼리 이어져 있지 않으면 null */
  route(from: LatLng, to: LatLng): LatLng[] | null;
}

/** 이보다 가까운 두 점은 도로를 찾지 않고 곧장 간다(m). */
export const DIRECT_M = 300;
const CACHE_SIZE = 4_000;
const CELL_DEG = 0.005;
const RAD = Math.PI / 180;
// 평면 근사(최근접 탐색 · 휴리스틱용). 위도 1도는 하버사인 기준(약 111.2km)보다 작게 잡아 거리를 넘겨 보지 않는다.
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320 * Math.cos(37.55 * RAD);
/**
 * A* 휴리스틱이 실제 도로 거리를 넘지 않도록 조금 줄인다. 경도 1도 미터값을 위도 37.55도로 고정했으므로
 * 이 여유(1%)는 데이터 범위가 그 위도에서 ±1도 안일 때만 성립한다(지금 범위 37.44–37.68).
 */
const H_FACTOR = 0.99;

export function decodeRoads(data: RoadData): RoadNetwork {
  const n = data.nodes.length / 2;
  const qy = new Int32Array(n);
  const qx = new Int32Array(n);
  const lat = new Float64Array(n);
  const lng = new Float64Array(n);
  let y = 0;
  let x = 0;
  for (let i = 0; i < n; i++) {
    y += data.nodes[2 * i]!;
    x += data.nodes[2 * i + 1]!;
    qy[i] = y;
    qx[i] = x;
    lat[i] = y / data.scale;
    lng[i] = x / data.scale;
  }

  // 간선 모양(a, 중간 점, b 순서의 [위도, 경도] 평면 배열)과 길이, 노드별 나가는 간선 수
  const m = data.edges.length / 3;
  const shapes: Float64Array[] = new Array<Float64Array>(m);
  const lengths = new Float64Array(m);
  const start = new Int32Array(n + 1);
  const snappable = new Uint8Array(n);
  for (let e = 0; e < m; e++) {
    const a = data.edges[3 * e]!;
    const b = data.edges[3 * e + 1]!;
    const flags = data.edges[3 * e + 2]!;
    const g = data.geometry[e] ?? [];
    const shape = new Float64Array(g.length + 4);
    shape[0] = lat[a]!;
    shape[1] = lng[a]!;
    let gy = qy[a]!;
    let gx = qx[a]!;
    for (let k = 0; k < g.length; k += 2) {
      gy += g[k]!;
      gx += g[k + 1]!;
      shape[k + 2] = gy / data.scale;
      shape[k + 3] = gx / data.scale;
    }
    shape[g.length + 2] = lat[b]!;
    shape[g.length + 3] = lng[b]!;
    let len = 0;
    for (let k = 2; k < shape.length; k += 2) {
      len += haversineMeters({ lat: shape[k - 2]!, lng: shape[k - 1]! }, { lat: shape[k]!, lng: shape[k + 1]! });
    }
    shapes[e] = shape;
    lengths[e] = len;
    start[a + 1] = start[a + 1]! + 1;
    if ((flags & 1) === 0) start[b + 1] = start[b + 1]! + 1;
    // 일반 도로가 하나라도 닿는 교차로만 출발 · 도착점을 붙일 후보로 둔다.
    if ((flags & 2) === 0) {
      snappable[a] = 1;
      snappable[b] = 1;
    }
  }
  for (let i = 0; i < n; i++) start[i + 1] = start[i + 1]! + start[i]!;

  // 나가는 간선 목록(CSR). 양방향 간선은 거꾸로 지나는 간선(rev)을 하나 더 둔다.
  const arcCount = start[n]!;
  const arcFrom = new Int32Array(arcCount);
  const arcTo = new Int32Array(arcCount);
  const arcEdge = new Int32Array(arcCount);
  const arcRev = new Uint8Array(arcCount);
  const arcLen = new Float64Array(arcCount);
  const fill = start.slice(0, n);
  const addArc = (from: number, to: number, e: number, rev: number) => {
    const k = fill[from]!;
    fill[from] = k + 1;
    arcFrom[k] = from;
    arcTo[k] = to;
    arcEdge[k] = e;
    arcRev[k] = rev;
    arcLen[k] = lengths[e]!;
  };
  for (let e = 0; e < m; e++) {
    const a = data.edges[3 * e]!;
    const b = data.edges[3 * e + 1]!;
    addArc(a, b, e, 0);
    if ((data.edges[3 * e + 2]! & 1) === 0) addArc(b, a, e, 1);
  }

  // 출발 · 도착점을 붙일 교차로(일반 도로가 닿는 곳) 찾기: 0.005도 격자
  if (!snappable.includes(1)) snappable.fill(1);
  const grid = new Map<number, number[]>();
  const cellY = (la: number) => Math.floor(la / CELL_DEG);
  const cellX = (ln: number) => Math.floor(ln / CELL_DEG);
  const cellKey = (cy: number, cx: number) => cy * 100_000 + cx;
  for (let i = 0; i < n; i++) {
    if (snappable[i] === 0) continue;
    const k = cellKey(cellY(lat[i]!), cellX(lng[i]!));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  const flat2 = (la: number, ln: number, i: number) => {
    const dy = (lat[i]! - la) * M_PER_DEG_LAT;
    const dx = (lng[i]! - ln) * M_PER_DEG_LNG;
    return dy * dy + dx * dx;
  };
  const cellM = CELL_DEG * Math.min(M_PER_DEG_LAT, M_PER_DEG_LNG);

  function nearestNode(p: LatLng): number {
    if (grid.size === 0) return -1;
    const cy = cellY(p.lat);
    const cx = cellX(p.lng);
    let best = -1;
    let bestD = Infinity;
    for (let r = 0; r <= 400; r++) {
      for (let dy = -r; dy <= r; dy++) {
        const edge = Math.abs(dy) === r;
        for (let dx = -r; dx <= r; dx += edge ? 1 : 2 * r) {
          const list = grid.get(cellKey(cy + dy, cx + dx));
          if (!list) continue;
          for (const i of list) {
            const d = flat2(p.lat, p.lng, i);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
        }
      }
      // 아직 보지 않은 칸(고리 r+1 이상)은 적어도 r칸 떨어져 있다.
      if (best >= 0 && Math.sqrt(bestD) <= r * cellM) break;
    }
    return best;
  }

  // A*: 버퍼를 재사용하고, 이번 탐색 번호(run)로 값이 유효한지 가린다.
  const g = new Float64Array(n);
  const parent = new Int32Array(n);
  const touched = new Uint32Array(n);
  const closed = new Uint32Array(n);
  let run = 0;
  const heapNode: number[] = [];
  const heapKey: number[] = [];
  const push = (node: number, key: number) => {
    let i = heapNode.length;
    heapNode.push(node);
    heapKey.push(key);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (heapKey[up]! <= key) break;
      heapNode[i] = heapNode[up]!;
      heapKey[i] = heapKey[up]!;
      i = up;
    }
    heapNode[i] = node;
    heapKey[i] = key;
  };
  const pop = (): number => {
    const top = heapNode[0]!;
    const lastNode = heapNode.pop()!;
    const lastKey = heapKey.pop()!;
    const size = heapNode.length;
    if (size > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= size) break;
        const r = l + 1;
        const c = r < size && heapKey[r]! < heapKey[l]! ? r : l;
        if (heapKey[c]! >= lastKey) break;
        heapNode[i] = heapNode[c]!;
        heapKey[i] = heapKey[c]!;
        i = c;
      }
      heapNode[i] = lastNode;
      heapKey[i] = lastKey;
    }
    return top;
  };
  const h = (i: number, t: number) => Math.sqrt(flat2(lat[t]!, lng[t]!, i)) * H_FACTOR;

  function search(s: number, t: number): number[] | null {
    run += 1;
    if (run === 0xffffffff) {
      touched.fill(0);
      closed.fill(0);
      run = 1;
    }
    heapNode.length = 0;
    heapKey.length = 0;
    touched[s] = run;
    g[s] = 0;
    parent[s] = -1;
    push(s, h(s, t));
    while (heapNode.length > 0) {
      const u = pop();
      if (closed[u] === run) continue;
      closed[u] = run;
      if (u === t) break;
      for (let k = start[u]!; k < start[u + 1]!; k++) {
        const v = arcTo[k]!;
        if (closed[v] === run) continue;
        const ng = g[u]! + arcLen[k]!;
        if (touched[v] !== run || ng < g[v]!) {
          touched[v] = run;
          g[v] = ng;
          parent[v] = k;
          push(v, ng + h(v, t));
        }
      }
    }
    if (closed[t] !== run) return null;
    const arcs: number[] = [];
    for (let v = t; v !== s; v = arcFrom[parent[v]!]!) arcs.push(parent[v]!);
    return arcs.reverse();
  }

  function pathPoints(s: number, arcs: readonly number[]): LatLng[] {
    const points: LatLng[] = [{ lat: lat[s]!, lng: lng[s]! }];
    for (const k of arcs) {
      const shape = shapes[arcEdge[k]!]!;
      const count = shape.length / 2;
      if (arcRev[k] === 1) {
        for (let j = count - 2; j >= 0; j--) points.push({ lat: shape[2 * j]!, lng: shape[2 * j + 1]! });
      } else {
        for (let j = 1; j < count; j++) points.push({ lat: shape[2 * j]!, lng: shape[2 * j + 1]! });
      }
    }
    return points;
  }

  const cache = new Map<number, LatLng[]>();
  function route(from: LatLng, to: LatLng): LatLng[] | null {
    if (n === 0) return null;
    if (haversineMeters(from, to) < DIRECT_M) return [to];
    const s = nearestNode(from);
    const t = nearestNode(to);
    if (s < 0 || t < 0) return null;
    if (s === t) return [to];
    const key = s * n + t;
    let mid = cache.get(key);
    if (mid) {
      cache.delete(key);
      cache.set(key, mid);
    } else {
      const arcs = search(s, t);
      if (!arcs) return null;
      mid = pathPoints(s, arcs);
      cache.set(key, mid);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
    }
    // 캐시한 배열을 그대로 내주지 않는다(엔진이 들고 있는 동안 다른 차와 섞이지 않게).
    // 안의 지점 객체는 캐시와 함께 쓰므로 바꾸지 않는다(엔진은 위치를 복사해 쓴다).
    return [...mid, to];
  }

  return {
    nodeCount: n,
    attribution: data.attribution,
    nodePos: (i) => ({ lat: lat[i]!, lng: lng[i]! }),
    nearestNode,
    route,
  };
}
