import type { I18n } from '../diagram/types';
import { haversineMeters, type LatLng } from './geo';

export interface Area {
  id: string;
  name: I18n;
  at: LatLng;
  strength: number;
}

// 예시 수요 권역. 실제 가중치는 운영 DB(StandWeight)에 있어 공개 코드로 확인할 수 없어서, 데모는 이 값을 쓰고 화면에 "예시"라고 밝힌다.
export const AREAS: readonly Area[] = [
  { id: 'seoul-station', name: { ko: '서울역', en: 'Seoul Station' }, at: { lat: 37.5547, lng: 126.9707 }, strength: 1 },
  { id: 'gwanghwamun', name: { ko: '광화문', en: 'Gwanghwamun' }, at: { lat: 37.5759, lng: 126.9768 }, strength: 1 },
  { id: 'gangnam', name: { ko: '강남역', en: 'Gangnam Station' }, at: { lat: 37.4979, lng: 127.0276 }, strength: 1 },
  { id: 'yeouido', name: { ko: '여의도', en: 'Yeouido' }, at: { lat: 37.5219, lng: 126.9245 }, strength: 1 },
  { id: 'hongdae', name: { ko: '홍대입구', en: 'Hongik Univ.' }, at: { lat: 37.5572, lng: 126.9254 }, strength: 0.8 },
  { id: 'jamsil', name: { ko: '잠실', en: 'Jamsil' }, at: { lat: 37.5133, lng: 127.1001 }, strength: 0.8 },
];

const SIGMA_M = 2_000;
const BASE_DEMAND = 0.1;
const AREA_NAME_WITHIN_M = 3_000;

/** 지점의 수요 가중치: 0.1 + Σ 강도 × exp(−d² / 2σ²). */
export function demandWeight(p: LatLng, areas: readonly Area[] = AREAS): number {
  let w = BASE_DEMAND;
  for (const a of areas) {
    const d = haversineMeters(p, a.at);
    w += a.strength * Math.exp(-(d * d) / (2 * SIGMA_M * SIGMA_M));
  }
  return w;
}

/** 3km 안에서 가장 가까운 권역. 없으면 null. */
export function nearestArea(p: LatLng, areas: readonly Area[] = AREAS): Area | null {
  let best: Area | null = null;
  let bestD = AREA_NAME_WITHIN_M;
  for (const a of areas) {
    const d = haversineMeters(p, a.at);
    if (d <= bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

export function boundsOf(points: readonly LatLng[]): { south: number; west: number; north: number; east: number } {
  return {
    south: Math.min(...points.map((p) => p.lat)),
    west: Math.min(...points.map((p) => p.lng)),
    north: Math.max(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lng)),
  };
}
