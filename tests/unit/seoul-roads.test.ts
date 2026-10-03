import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { haversineMeters, type LatLng } from '../../src/lib/baro-sim/geo';
import { createRng, intBetween } from '../../src/lib/baro-sim/random';
import { decodeRoads } from '../../src/lib/baro-sim/roads';
import { STANDS } from '../../src/lib/baro-sim/stands';
import type { RoadData } from '../../src/lib/baro-sim/roadbuild';

const raw = readFileSync('src/data/seoul-roads.json');
const data = JSON.parse(raw.toString('utf8')) as RoadData;
const roads = decodeRoads(data);
const length = (from: LatLng, points: readonly LatLng[]) =>
  points.reduce((sum, p, i) => sum + haversineMeters(i === 0 ? from : points[i - 1]!, p), 0);

describe('Seoul road data', () => {
  it('credits OpenStreetMap under the ODbL and stays small', () => {
    expect(data.attribution).toMatch(/OpenStreetMap/);
    expect(data.attribution).toMatch(/ODbL/);
    expect(gzipSync(raw).length).toBeLessThan(300 * 1024);
    expect(roads.nodeCount).toBeGreaterThan(10_000);
  });

  it('has a junction within 600 m of every taxi stand', () => {
    for (const s of STANDS) expect(haversineMeters(s, roads.nodePos(roads.nearestNode(s)))).toBeLessThan(600);
  });

  it('finds a road route between taxi stands that is longer than the straight line but not absurdly so', () => {
    // 한강을 건너려고 다리까지 돌아가는 경우가 있어 한 쌍은 4배 미만, 전체 중앙값은 1.5배 미만으로 본다.
    const rng = createRng(11);
    const ratios: number[] = [];
    const started = performance.now();
    while (ratios.length < 150) {
      const a = STANDS[intBetween(rng, 0, STANDS.length - 1)]!;
      const b = STANDS[intBetween(rng, 0, STANDS.length - 1)]!;
      const straight = haversineMeters(a, b);
      if (straight < 2_000 || straight > 10_000) continue;
      const route = roads.route(a, b);
      expect(route).not.toBeNull();
      const ratio = length(a, route!) / straight;
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThan(4);
      ratios.push(ratio);
    }
    ratios.sort((x, y) => x - y);
    expect(ratios[75]!).toBeLessThan(1.5);
    expect(performance.now() - started).toBeLessThan(3_000);
  });
});
