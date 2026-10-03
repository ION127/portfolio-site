import { describe, expect, it } from 'vitest';
import { buildRoadGraph, direction, isRoad, simplify, type OsmElement } from '../../src/lib/baro-sim/roadbuild';

const node = (id: number, lat: number, lon: number): OsmElement => ({ type: 'node', id, lat, lon });
const way = (id: number, nodes: number[], tags: Record<string, string> = { highway: 'primary' }): OsmElement => ({
  type: 'way',
  id,
  nodes,
  tags,
});

describe('road graph build', () => {
  it('keeps junctions and way ends as nodes and folds the points between them into edge shapes', () => {
    const elements = [
      node(1, 37.5, 127.0),
      node(2, 37.501, 127.005),
      node(3, 37.5, 127.01),
      node(4, 37.5, 127.02),
      node(5, 37.495, 127.01),
      node(6, 37.505, 127.01),
      way(10, [1, 2, 3, 4]),
      way(11, [5, 3, 6]),
    ];
    const { data, stats } = buildRoadGraph(elements, { tolerance: 0 });
    expect(stats).toMatchObject({ ways: 2, nodes: 5, edges: 4, points: 1, dropped: 0 });
    expect(data.nodes).toHaveLength(10);
    expect(data.edges).toHaveLength(12);
    expect(data.geometry.flat()).toHaveLength(2);
  });

  it('reads one-way rules from OSM tags', () => {
    expect(direction({ highway: 'primary' })).toBe(0);
    expect(direction({ highway: 'primary', oneway: 'yes' })).toBe(1);
    expect(direction({ highway: 'primary', oneway: '-1' })).toBe(-1);
    expect(direction({ highway: 'motorway' })).toBe(1);
    expect(direction({ highway: 'motorway', oneway: 'no' })).toBe(0);
    expect(direction({ highway: 'secondary', junction: 'roundabout' })).toBe(1);
  });

  it('keeps only motorway to tertiary roads and their links', () => {
    expect(['motorway', 'trunk_link', 'primary', 'secondary_link', 'tertiary'].every(isRoad)).toBe(true);
    expect(['residential', 'service', 'footway', undefined].some(isRoad)).toBe(false);
  });

  it('stores a reversed one-way street in its legal direction', () => {
    const elements = [
      node(1, 37.5, 127.0),
      node(2, 37.5, 127.01),
      node(3, 37.51, 127.005),
      way(10, [1, 2], { highway: 'primary', oneway: '-1' }), // 실제로는 2 → 1로만 간다
      way(11, [1, 3, 2]), // 양방향 우회로(3은 모양 점)
    ];
    const { data } = buildRoadGraph(elements, { tolerance: 0 });
    const triples = [0, 3].map((i) => data.edges.slice(i, i + 3));
    // 교차로 번호는 위도 · 경도 순이라 1 → 0, 2 → 1이다.
    expect(triples).toContainEqual([1, 0, 1]);
    expect(triples).not.toContainEqual([0, 1, 1]);
  });

  it('drops non-road ways and pieces that cannot be reached both ways', () => {
    const elements = [
      node(1, 37.5, 127.0),
      node(2, 37.5, 127.01),
      node(3, 37.51, 127.01),
      node(4, 37.52, 127.01),
      node(5, 37.5, 127.02),
      way(10, [1, 2, 3]),
      way(11, [3, 4], { highway: 'primary', oneway: 'yes' }),
      way(12, [2, 5], { highway: 'residential' }),
    ];
    const { stats } = buildRoadGraph(elements, { tolerance: 0 });
    expect(stats).toMatchObject({ ways: 2, nodes: 2, edges: 1, dropped: 1 });
  });

  it('stores coordinates as integer differences', () => {
    const elements = [node(1, 37.51234, 127.01234), node(2, 37.52345, 127.02345), way(10, [1, 2])];
    const { data } = buildRoadGraph(elements);
    expect(data.nodes.every(Number.isInteger)).toBe(true);
    expect(data.nodes).toEqual([3751234, 12701234, 1111, 1111]);
    expect(data.attribution).toMatch(/OpenStreetMap/);
    expect(data.attribution).toMatch(/ODbL/);
  });

  it('simplifies edge shapes within the tolerance', () => {
    const points: [number, number][] = [
      [37.5, 127.0],
      [37.50001, 127.001],
      [37.5, 127.002],
    ];
    expect(simplify(points, 5)).toHaveLength(2);
    expect(simplify(points, 0.5)).toHaveLength(3);
  });
});
