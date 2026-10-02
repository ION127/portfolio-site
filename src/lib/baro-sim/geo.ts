import type { Rng } from './random';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEG_LAT = 111_320;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** 두 지점 사이 거리(m). 실제 배차 서비스와 같은 하버사인 공식이다. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** a에서 b 쪽으로 meters만큼 간 지점. 서울 안의 짧은 거리라 위경도 선형 보간으로 충분하다. 넘치면 b에 멈춘다. */
export function moveToward(a: LatLng, b: LatLng, meters: number): LatLng {
  const d = haversineMeters(a, b);
  if (d <= meters) return { lat: b.lat, lng: b.lng };
  const t = meters / d;
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** center에서 반경 meters 안의 무작위 지점. */
export function jitter(rng: Rng, center: LatLng, meters: number): LatLng {
  const r = meters * Math.sqrt(rng());
  const theta = rng() * 2 * Math.PI;
  return {
    lat: center.lat + (r * Math.cos(theta)) / METERS_PER_DEG_LAT,
    lng: center.lng + (r * Math.sin(theta)) / (METERS_PER_DEG_LAT * Math.cos(rad(center.lat))),
  };
}

/** 위도 lat에서 동쪽으로 meters만큼의 경도 차. 반경 원을 그릴 때 쓴다. */
export const metersToLngDeg = (lat: number, meters: number): number => meters / (METERS_PER_DEG_LAT * Math.cos(rad(lat)));
