import { describe, expect, it } from 'vitest';
import { between, createRng, intBetween, pickWeighted } from '../../src/lib/baro-sim/random';
import { haversineMeters, jitter, moveToward } from '../../src/lib/baro-sim/geo';
import { STANDS } from '../../src/lib/baro-sim/stands';
import { AREAS, boundsOf, demandWeight, nearestArea } from '../../src/lib/baro-sim/demand';

const SEOUL_STATION = { lat: 37.5547, lng: 126.9707 };
const GANGNAM = { lat: 37.4979, lng: 127.0276 };

describe('seeded random', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, createRng(43))).not.toEqual(seqA);
    for (const x of seqA) expect(x >= 0 && x < 1).toBe(true);
  });

  it('keeps integer ranges inclusive and weighted picks proportional', () => {
    const rng = createRng(1);
    const ints = new Set(Array.from({ length: 2000 }, () => intBetween(rng, 1, 3)));
    expect([...ints].sort()).toEqual([1, 2, 3]);
    expect(between(createRng(2), 5, 5)).toBe(5);
    let heavy = 0;
    for (let i = 0; i < 10_000; i++) if (pickWeighted(rng, ['a', 'b'], [1, 3]) === 'b') heavy++;
    expect(heavy / 10_000).toBeGreaterThan(0.72);
    expect(heavy / 10_000).toBeLessThan(0.78);
  });
});

describe('geo', () => {
  it('measures Seoul Station to Gangnam Station at about 8 km', () => {
    const d = haversineMeters(SEOUL_STATION, GANGNAM);
    expect(d).toBeGreaterThan(7_900);
    expect(d).toBeLessThan(8_300);
  });

  it('moves toward a target and stops exactly on it', () => {
    const half = moveToward(SEOUL_STATION, GANGNAM, 4_000);
    expect(haversineMeters(SEOUL_STATION, half)).toBeCloseTo(4_000, -1);
    expect(moveToward(SEOUL_STATION, GANGNAM, 50_000)).toEqual(GANGNAM);
  });

  it('jitters within the radius', () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i++) expect(haversineMeters(GANGNAM, jitter(rng, GANGNAM, 400))).toBeLessThanOrEqual(401);
  });
});

describe('stands and demand', () => {
  it('keeps all 254 taxi stands from the simulator config inside Seoul', () => {
    expect(STANDS).toHaveLength(254);
    expect(STANDS[0]).toEqual({ lat: 37.57042, lng: 126.97524 });
    for (const s of STANDS) {
      expect(s.lat).toBeGreaterThan(37.4);
      expect(s.lat).toBeLessThan(37.7);
      expect(s.lng).toBeGreaterThan(126.7);
      expect(s.lng).toBeLessThan(127.2);
    }
  });

  it('weights demand around the example areas and names the nearest one', () => {
    expect(demandWeight(GANGNAM)).toBeGreaterThan(demandWeight({ lat: 37.6, lng: 127.08 }) * 2);
    expect(nearestArea({ lat: 37.499, lng: 127.028 })?.id).toBe('gangnam');
    expect(nearestArea({ lat: 37.65, lng: 126.82 })).toBeNull();
    expect(AREAS.map((a) => a.id)).toEqual(['seoul-station', 'gwanghwamun', 'gangnam', 'yeouido', 'hongdae', 'jamsil']);
  });

  it('computes the bounds of a point set', () => {
    expect(boundsOf([SEOUL_STATION, GANGNAM])).toEqual({ south: 37.4979, west: 126.9707, north: 37.5547, east: 127.0276 });
  });
});
