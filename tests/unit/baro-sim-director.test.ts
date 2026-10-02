import { describe, expect, it } from 'vitest';
import { createSim, type Sim } from '../../src/lib/baro-sim/engine';
import { ACK_WAIT_SCALE, createDirector, DEFAULT_TIMING, TIME_SCALE, type Director, type Phase } from '../../src/lib/baro-sim/director';

const sim = () => createSim({ seed: 7, vehicleCount: 400, callsPerMinute: 20 });

/** 따라가기가 n번 끝날 때까지 돌리며 단계 · 배속 · ACK 실패 여부를 모은다. */
function run(spotlights: number) {
  const s = sim();
  const d = createDirector(s);
  const phases: Phase[] = [d.phase];
  const scales = new Map<Phase, Set<number>>();
  const failed: boolean[] = [];
  let ended = 0;
  for (let i = 0; i < 20_000 && ended < spotlights; i++) {
    const before = d.phase;
    const fail = d.spotlight?.ackFailed ?? false;
    d.tick(0.05);
    if (!scales.has(d.phase)) scales.set(d.phase, new Set());
    scales.get(d.phase)!.add(d.timeScale);
    if (d.phase !== before) {
      phases.push(d.phase);
      if (before === 'relocate' && d.phase === 'overview') {
        ended++;
        failed.push(fail);
      }
    }
  }
  return { phases, scales, failed, ended };
}

function runUntil(d: Director, phase: Phase) {
  for (let i = 0; i < 20_000 && d.phase !== phase; i++) d.tick(0.05);
  expect(d.phase).toBe(phase);
}

/** car가 있는 자리에 다른 호출을 넣어 그 차를 배차한다. */
function takeCar(s: Sim, id: number) {
  const car = s.vehicleById(id)!;
  s.dispatch(s.addCall(car.pos, s.randomTripDestination(car.pos)));
  return car;
}

describe('director', () => {
  it('starts with the city overview and picks a ride after 4 seconds', () => {
    const s = sim();
    const d = createDirector(s);
    expect(d.phase).toBe('overview');
    expect(d.timeScale).toBe(30);
    d.tick(4);
    expect(d.phase).toBe('call');
    expect(d.timeScale).toBe(0);
    const call = s.calls.get(d.spotlight!.callId)!;
    expect(call.manual).toBe(true);
    expect(call.status).toBe('searching');
  });

  it('walks one ride through every step in order', () => {
    const { phases, ended } = run(1);
    expect(ended).toBe(1);
    expect(phases).toEqual(['overview', 'call', 'search', 'reserve', 'ack', 'pickup', 'trip', 'relocate', 'overview']);
  });

  it('slows to real time for the decisions and speeds up for driving', () => {
    const { scales } = run(3);
    expect([...scales.get('search')!]).toEqual([TIME_SCALE.search]);
    expect([...scales.get('reserve')!]).toEqual([0]);
    expect([...scales.get('ack')!].every((x) => x === 1 || x === ACK_WAIT_SCALE)).toBe(true);
    expect([...scales.get('pickup')!]).toEqual([60]);
    expect([...scales.get('trip')!]).toEqual([60]);
    expect([...scales.get('relocate')!]).toEqual([30]);
  });

  it('lets go of a relocating car as soon as another request takes it', () => {
    const s = sim();
    const d = createDirector(s);
    runUntil(d, 'relocate');
    const car = takeCar(s, d.spotlight!.vehicleId!);
    expect(car.state).toBe('reserved');
    d.tick(0.01);
    expect(d.phase).toBe('overview');
    expect(d.spotlight).toBeNull();
  });

  it('explains a ride that has no car left to retry before returning to the city view', () => {
    const s = createSim({ seed: 7, vehicleCount: 3, callsPerMinute: 0 });
    const d = createDirector(s, { ...DEFAULT_TIMING, failEvery: 1 });
    runUntil(d, 'ack');
    const spot = d.spotlight!;
    expect(spot.waitingSilent).toBe(true);
    // 응답하지 않는 차를 놓은 뒤 다시 배차할 빈 차가 없도록, 나머지 차를 모두 다른 호출에 배차한다.
    for (const v of s.vehicles) if (v.id !== spot.vehicleId && (v.state === 'idle' || v.state === 'relocating')) takeCar(s, v.id);
    for (let i = 0; i < 400 && !d.spotlight?.failed; i++) d.tick(0.05);
    expect(d.spotlight?.failed).toBe(true);
    expect(d.phase).toBe('ack');
    expect(d.timeScale).toBe(0);
    d.tick(DEFAULT_TIMING.failedS);
    expect(d.phase).toBe('overview');
  });

  it('shows the missed-ACK retry on every third ride', () => {
    const { failed } = run(3);
    expect(failed).toEqual([false, false, true]);
  });
});
