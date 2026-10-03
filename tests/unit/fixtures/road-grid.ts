import { buildRoadGraph, type OsmElement } from '../../../src/lib/baro-sim/roadbuild';
import { decodeRoads, type RoadNetwork } from '../../../src/lib/baro-sim/roads';
import type { LatLng } from '../../../src/lib/baro-sim/geo';

/** 3×3 격자 도로의 교차로 좌표(행 r: 위도 37.50 + 0.01·r, 열 c: 경도 127.00 + 0.01·c). */
export const gridPoint = (r: number, c: number): LatLng => ({ lat: 37.5 + 0.01 * r, lng: 127.0 + 0.01 * c });

/** 3×3 격자 도로. 맨 아래 줄 가운데 → 오른쪽 구간만 동쪽으로 가는 일방통행이다. */
export function gridRoads(): RoadNetwork {
  const id = (r: number, c: number) => r * 3 + c + 1;
  const elements: OsmElement[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const p = gridPoint(r, c);
      elements.push({ type: 'node', id: id(r, c), lat: p.lat, lon: p.lng });
    }
  }
  let w = 100;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const tags = r === 0 && c === 1 ? { highway: 'primary', oneway: 'yes' } : { highway: 'primary' };
      elements.push({ type: 'way', id: w++, nodes: [id(r, c), id(r, c + 1)], tags });
    }
  }
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 2; r++) elements.push({ type: 'way', id: w++, nodes: [id(r, c), id(r + 1, c)], tags: { highway: 'primary' } });
  }
  return decodeRoads(buildRoadGraph(elements, { tolerance: 0 }).data);
}
