import { describe, expect, it } from 'vitest';
import { chooseRelocationStand, createSim, DEFAULTS, type SimEvent } from '../../src/lib/baro-sim/engine';
import { haversineMeters, type LatLng } from '../../src/lib/baro-sim/geo';
import { STANDS } from '../../src/lib/baro-sim/stands';

const O: LatLng = { lat: 37.5, lng: 127.0 };
const north = (m: number): LatLng => ({ lat: O.lat + m / 111_320, lng: O.lng });
const DEST = { lat: 37.52, lng: 127.03 };
const quiet = { callsPerMinute: 0, backgroundAckFailRate: 0 };

describe('starting fleet', () => {
  it('places 1,500 cars at the 254 stands, like the original simulator', () => {
    const sim = createSim({ seed: 1 });
    expect(sim.vehicles).toHaveLength(1500);
    expect(sim.vehicles[0]!.id).toBe(1001);
    expect(sim.vehicles[1499]!.id).toBe(2500);
    for (const v of sim.vehicles) {
      const nearStand = STANDS.some((s) => Math.abs(s.lat - v.pos.lat) <= 0.0003 + 1e-9 && Math.abs(s.lng - v.pos.lng) <= 0.0003 + 1e-9);
      expect(nearStand).toBe(true);
      expect(v.plate).toMatch(/^\d{3}[가나다라마바사아자차카타파하]\d{4}$/);
    }
    expect(new Set(sim.vehicles.map((v) => v.plate)).size).toBe(1500);
  });

  it('uses the rules from the real code', () => {
    expect(DEFAULTS).toMatchObject({ vehicleCount: 1500, speedKmh: 60, searchRadiusM: 15_000, maxCandidates: 10, ackTimeoutS: 10 });
    expect(DEFAULTS.relocationRadiiM).toEqual([10_000, 30_000]);
  });
});

describe('dispatch', () => {
  it('reserves the nearest free car within 15 km and skips reserved or distant ones', () => {
    const sim = createSim({ seed: 1, ...quiet, stands: [O], vehiclePositions: [north(16_000), north(1000), north(2000)] });
    const first = sim.dispatch(sim.addCall(O, DEST, { manual: true }));
    expect(first[0]).toMatchObject({ type: 'reserved', vehicleId: 1002 });
    expect((first[0] as { distanceM: number }).distanceM).toBeCloseTo(1000, -1);
    expect(sim.dispatch(sim.addCall(O, DEST, { manual: true }))[0]).toMatchObject({ type: 'reserved', vehicleId: 1003 });
    const third = sim.addCall(O, DEST, { manual: true });
    expect(sim.dispatch(third)).toEqual([{ type: 'failed', callId: third }]);
    expect(sim.calls.get(third)!.status).toBe('failed');
  });

  it('searches up to 15 km and keeps only the 10 nearest candidates, like the real service', () => {
    const far = createSim({ seed: 1, ...quiet, stands: [O], vehiclePositions: [north(12_000)] });
    expect(far.dispatch(far.addCall(O, DEST, { manual: true }))[0]).toMatchObject({ type: 'reserved', vehicleId: 1001 });
    const many = createSim({ seed: 1, ...quiet, stands: [O], vehiclePositions: Array.from({ length: 12 }, (_, i) => north((i + 1) * 1000)) });
    const found = many.candidates(O);
    expect(found).toHaveLength(10);
    expect(found[9]!.id).toBe(1010);
  });

  it('re-dispatches to the next car when the first one does not acknowledge within 10 s', () => {
    const sim = createSim({ seed: 1, ...quiet, stands: [O], vehiclePositions: [north(1000), north(2000)] });
    const id = sim.addCall(O, DEST, { manual: true, failFirstAck: true });
    expect(sim.dispatch(id)[0]).toMatchObject({ type: 'reserved', vehicleId: 1001 });
    expect(sim.step(9.9).filter((e) => e.type === 'ackTimeout')).toEqual([]);
    const events = sim.step(0.2);
    expect(events.map((e) => e.type)).toEqual(['ackTimeout', 'reserved']);
    expect(events[1]).toMatchObject({ vehicleId: 1002 });
    expect(sim.vehicleById(1001)!.state).toBe('idle');
    expect(sim.step(2.5).some((e) => e.type === 'ackOk')).toBe(true);
    expect(sim.vehicleById(1002)!.state).toBe('pickup');
    expect(sim.dispatchedCount).toBe(1);
  });
});

describe('moving', () => {
  it('drives at 60 km/h in a straight line', () => {
    const sim = createSim({ seed: 1, ...quiet, stands: [O], vehiclePositions: [north(3000)] });
    const id = sim.addCall(O, DEST, { manual: true });
    sim.dispatch(id);
    let ackAt = -1;
    let pickedAt = -1;
    for (let i = 0; i < 400 && pickedAt < 0; i++) {
      for (const e of sim.step(1)) {
        if (e.type === 'ackOk') ackAt = sim.time;
        if (e.type === 'pickedUp') pickedAt = sim.time;
      }
    }
    expect(pickedAt - ackAt).toBeGreaterThan(178);
    expect(pickedAt - ackAt).toBeLessThan(182);
  });

  it('relocates after a trip, and a relocating car can take the next call', () => {
    const highDemand = { lat: 37.4979, lng: 127.0276 }; // 강남역
    const lowDemand = { lat: 37.4979, lng: 127.0616 }; // 동쪽 약 3km
    const sim = createSim({ seed: 1, ...quiet, stands: [highDemand, lowDemand], vehiclePositions: [highDemand] });
    sim.dispatch(sim.addCall(highDemand, lowDemand, { manual: true }));
    let relocating: SimEvent | undefined;
    for (let i = 0; i < 400 && !relocating; i++) relocating = sim.step(1).find((e) => e.type === 'relocating');
    expect(relocating).toMatchObject({ standIndex: 0 });
    expect(sim.vehicleById(1001)!.state).toBe('relocating');
    const next = sim.addCall(lowDemand, highDemand, { manual: true });
    expect(sim.dispatch(next)[0]).toMatchObject({ type: 'reserved', vehicleId: 1001 });
    // 재배치를 막 시작한 차는 호출 지점 바로 옆이라, 응답하자마자 승객을 태운다.
    expect(sim.step(2.5)).toContainEqual({ type: 'ackOk', callId: next, vehicleId: 1001 });
    expect(sim.vehicleById(1001)!.callId).toBe(next);
  });
});

describe('relocation score', () => {
  const at = (km: number): LatLng => north(km * 1000);
  it('prefers demand (70%) over distance (30%) within 10 km', () => {
    expect(chooseRelocationStand(O, [at(9), at(1), at(15)], [5, 1, 100])).toBe(0);
  });
  it('widens to 30 km when nothing is within 10 km', () => {
    expect(chooseRelocationStand(O, [at(20), at(12)], [1, 1])).toBe(1);
  });
  it('falls back to the nearest stand when nothing is within 30 km', () => {
    expect(chooseRelocationStand(O, [at(50), at(40)], [1, 1])).toBe(1);
  });
});

describe('whole simulation', () => {
  it('always accounts for every car and fills every state', () => {
    const sim = createSim({ seed: 5 });
    sim.step(600);
    const c = sim.counts();
    expect(c.idle + c.pickup + c.trip + c.relocating).toBe(1500);
    for (const n of Object.values(c)) expect(n).toBeGreaterThan(0);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const sim = createSim({ seed });
      sim.step(300);
      return JSON.stringify(sim.vehicles.map((v) => [v.state, v.pos.lat.toFixed(6), v.pos.lng.toFixed(6)]));
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it('only creates trips of 2 to 10 km for background calls', () => {
    const sim = createSim({ seed: 9 });
    const seen: number[] = [];
    for (let i = 0; i < 120; i++) {
      for (const e of sim.step(1)) {
        if (e.type !== 'call') continue;
        const call = sim.calls.get(e.callId);
        if (call) seen.push(haversineMeters(call.origin, call.destination));
      }
    }
    expect(seen.length).toBeGreaterThan(50);
    for (const d of seen) {
      expect(d).toBeGreaterThan(2000 - 800);
      expect(d).toBeLessThan(10_000 + 800);
    }
  });
});
