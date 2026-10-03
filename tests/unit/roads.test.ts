import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../../src/lib/baro-sim/geo';
import { createRng, between } from '../../src/lib/baro-sim/random';
import { buildRoadGraph } from '../../src/lib/baro-sim/roadbuild';
import { decodeRoads } from '../../src/lib/baro-sim/roads';
import { gridPoint, gridRoads } from './fixtures/road-grid';

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => haversineMeters(a, b) < 0.5;

describe('road routing', () => {
  it('follows the shortest road path and ends exactly at the destination', () => {
    const roads = gridRoads();
    const to = gridPoint(0, 2);
    const route = roads.route(gridPoint(0, 0), to)!;
    expect(route).toHaveLength(4);
    expect(near(route[0]!, gridPoint(0, 0))).toBe(true);
    expect(near(route[1]!, gridPoint(0, 1))).toBe(true);
    expect(near(route[2]!, gridPoint(0, 2))).toBe(true);
    expect(route[3]).toBe(to);
  });

  it('detours around a one-way street instead of driving against it', () => {
    const roads = gridRoads();
    const route = roads.route(gridPoint(0, 2), gridPoint(0, 1))!;
    expect(route.some((p) => near(p, gridPoint(1, 2)))).toBe(true);
    expect(route.some((p) => near(p, gridPoint(1, 1)))).toBe(true);
  });

  it('starts from the nearest junction and walks the last stretch straight to an off-road point', () => {
    const roads = gridRoads();
    const from = { lat: 37.5003, lng: 127.0002 };
    const to = { lat: 37.5197, lng: 127.0204 };
    const route = roads.route(from, to)!;
    expect(near(route[0]!, gridPoint(0, 0))).toBe(true);
    expect(near(route[route.length - 2]!, gridPoint(2, 2))).toBe(true);
    expect(route[route.length - 1]).toBe(to);
  });

  it('walks a curved two-way road backwards through its shape points', () => {
    const a = { lat: 37.5, lng: 127.0 };
    const bend = { lat: 37.505, lng: 127.005 };
    const b = { lat: 37.5, lng: 127.01 };
    const roads = decodeRoads(
      buildRoadGraph(
        [
          { type: 'node', id: 1, lat: a.lat, lon: a.lng },
          { type: 'node', id: 2, lat: bend.lat, lon: bend.lng },
          { type: 'node', id: 3, lat: b.lat, lon: b.lng },
          { type: 'way', id: 10, nodes: [1, 2, 3], tags: { highway: 'primary' } },
        ],
        { tolerance: 0 },
      ).data,
    );
    const route = roads.route(b, a)!;
    expect(route).toHaveLength(4);
    expect(near(route[0]!, b)).toBe(true);
    expect(near(route[1]!, bend)).toBe(true);
    expect(near(route[2]!, a)).toBe(true);
  });

  it('goes straight between points closer than the direct threshold', () => {
    const roads = gridRoads();
    const to = { lat: 37.5005, lng: 127.0005 };
    expect(roads.route(gridPoint(0, 0), to)).toEqual([to]);
  });

  it('snaps to the junction a brute-force search finds (within 1% for near ties)', () => {
    const roads = gridRoads();
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const p = { lat: between(rng, 37.45, 37.57), lng: between(rng, 126.95, 127.07) };
      let bestD = Infinity;
      for (let n = 0; n < roads.nodeCount; n++) bestD = Math.min(bestD, haversineMeters(p, roads.nodePos(n)));
      // 탐색은 평면 근사 거리로 고르므로, 거의 같은 거리의 두 교차로 사이에서는 1% 안의 차이를 허용한다.
      expect(haversineMeters(p, roads.nodePos(roads.nearestNode(p)))).toBeLessThanOrEqual(bestD * 1.01);
    }
  });

  it('keeps searching outward until no unseen cell can hold a closer junction', () => {
    // 대각선 옆 칸의 먼 교차로(x)보다 두 칸 옆의 가까운 교차로(y)를 골라야 한다.
    const p = { lat: 37.50005, lng: 127.00005 };
    const x = { lat: 37.50995, lng: 127.00995 };
    const y = { lat: 37.50005, lng: 127.01001 };
    const roads = decodeRoads(
      buildRoadGraph(
        [
          { type: 'node', id: 1, lat: x.lat, lon: x.lng },
          { type: 'node', id: 2, lat: y.lat, lon: y.lng },
          { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'primary' } },
        ],
        { tolerance: 0 },
      ).data,
    );
    expect(near(roads.nodePos(roads.nearestNode(p)), y)).toBe(true);
  });

  it('hands out a fresh array each time, even for a cached path', () => {
    const roads = gridRoads();
    const a = roads.route(gridPoint(0, 0), gridPoint(2, 2))!;
    const b = roads.route(gridPoint(0, 0), gridPoint(2, 2))!;
    expect(b).toEqual(a);
    expect(b).not.toBe(a);
    a.length = 0;
    expect(roads.route(gridPoint(0, 0), gridPoint(2, 2))).toEqual(b);
  });
});
