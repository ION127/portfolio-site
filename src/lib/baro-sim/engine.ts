import { demandWeight } from './demand';
import { haversineMeters, jitter, moveToward, type LatLng } from './geo';
import { between, createRng, intBetween, pick, pickWeighted, type Rng } from './random';
import { STANDS } from './stands';

export type VehicleState = 'idle' | 'reserved' | 'pickup' | 'trip' | 'relocating';
/** 패널에 보이는 상태. 예약되어 응답을 기다리는 차(reserved)는 픽업 중으로 센다. */
export type CountKey = 'idle' | 'pickup' | 'trip' | 'relocating';

export interface Vehicle {
  readonly id: number;
  readonly plate: string;
  pos: LatLng;
  state: VehicleState;
  target: LatLng | null;
  callId: number | null;
  standIndex: number | null;
}

export type CallStatus = 'searching' | 'reserved' | 'pickup' | 'trip' | 'done' | 'failed';

export interface Call {
  readonly id: number;
  readonly origin: LatLng;
  readonly destination: LatLng;
  readonly createdAt: number;
  status: CallStatus;
  vehicleId: number | null;
  /** ACK를 하지 않아 빠진 차. 다시 배차할 때 후보에서 뺀다. */
  tried: number[];
  reservedAt: number | null;
  /** 응답 시각. null이면 이번 예약은 응답하지 않고 ACK 시간 초과로 끝난다. */
  ackAt: number | null;
  failFirstAck: boolean;
  /** 연출기가 직접 배차 시점을 정하는 호출. */
  manual: boolean;
  endedAt: number | null;
}

export type SimEvent =
  | { type: 'call'; callId: number }
  | { type: 'reserved'; callId: number; vehicleId: number; distanceM: number }
  | { type: 'ackOk'; callId: number; vehicleId: number }
  | { type: 'ackTimeout'; callId: number; vehicleId: number }
  | { type: 'pickedUp'; callId: number; vehicleId: number }
  | { type: 'arrived'; callId: number; vehicleId: number }
  | { type: 'relocating'; callId: number; vehicleId: number; standIndex: number }
  | { type: 'relocated'; vehicleId: number }
  | { type: 'failed'; callId: number };

export interface SimOptions {
  seed: number;
  vehicleCount?: number;
  stands?: readonly LatLng[];
  /** 차량 시작 위치를 직접 정한다(테스트용). 주면 vehicleCount 대신 이 길이를 쓴다. */
  vehiclePositions?: readonly LatLng[];
  callsPerMinute?: number;
  speedKmh?: number;
  searchRadiusM?: number;
  maxCandidates?: number;
  ackTimeoutS?: number;
  backgroundAckFailRate?: number;
  relocationRadiiM?: readonly number[];
}

export interface AddCallOptions {
  manual?: boolean;
  failFirstAck?: boolean;
}

// 실제 코드의 값. 출처는 docs/facts.md.
export const DEFAULTS = {
  vehicleCount: 1500, // baro-edge vehicle_simulator.py
  callsPerMinute: 75, // 데모용. 바쁜 차(픽업·운행)가 30~40%가 되게 맞춘 값
  speedKmh: 60, // baro-edge config.py SIM_VEHICLE_SPEED
  // dispatch-service는 반경 목록(idle-car-search-radii-km: 5, 10, 15) 중 가장 큰 값으로 한 번 찾는다(RedisDispatchableCarProjection).
  searchRadiusM: 15_000,
  maxCandidates: 10, // DispatchRedisProperties.idleCarMaxCandidates
  ackTimeoutS: 10, // dispatch-service ack-timeout-seconds
  backgroundAckFailRate: 0.02, // 데모용
  relocationRadiiM: [10_000, 30_000] as readonly number[], // relocation-service RelocationService
};

const START_JITTER_DEG = 0.0003; // baro-edge random_position
const CALL_JITTER_M = 400;
const TRIP_MIN_M = 2_000;
const TRIP_MAX_M = 10_000;
const MAX_STEP_S = 1;
const FAILED_CALL_TTL_S = 60;
const KOR_CHARS = [...'가나다라마바사아자차카타파하'];
const W_DEMAND = 0.7;
const W_DISTANCE = 0.3;

/** 재배치할 승차대: 반경 안에서 0.7 × 정규화 가중치 − 0.3 × 정규화 거리가 가장 큰 곳(relocation-service와 같은 계산). */
export function chooseRelocationStand(
  pos: LatLng,
  stands: readonly LatLng[],
  weights: readonly number[],
  radii: readonly number[] = DEFAULTS.relocationRadiiM,
): number {
  const dist = stands.map((s) => haversineMeters(pos, s));
  let pool: number[] = [];
  for (const r of radii) {
    pool = dist.flatMap((d, i) => (d <= r ? [i] : []));
    if (pool.length > 0) break;
  }
  if (pool.length === 0) return dist.indexOf(Math.min(...dist));
  const ws = pool.map((i) => weights[i]!);
  const ds = pool.map((i) => dist[i]!);
  const wMin = Math.min(...ws);
  const wMax = Math.max(...ws);
  const dMin = Math.min(...ds);
  const dMax = Math.max(...ds);
  let best = pool[0]!;
  let bestScore = -Infinity;
  for (const i of pool) {
    const nw = wMax === wMin ? 1 : (weights[i]! - wMin) / (wMax - wMin);
    const nd = dMax === dMin ? 1 : (dist[i]! - dMin) / (dMax - dMin);
    const score = nw * W_DEMAND - nd * W_DISTANCE;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export interface Sim {
  readonly time: number;
  readonly dispatchedCount: number;
  readonly vehicles: readonly Vehicle[];
  readonly calls: ReadonlyMap<number, Call>;
  readonly stands: readonly LatLng[];
  readonly standWeights: readonly number[];
  step(dt: number): SimEvent[];
  addCall(origin: LatLng, destination: LatLng, options?: AddCallOptions): number;
  dispatch(callId: number): SimEvent[];
  candidates(point: LatLng, exclude?: readonly number[]): Vehicle[];
  counts(): Record<CountKey, number>;
  randomOrigin(): LatLng;
  randomTripDestination(origin: LatLng): LatLng;
  vehicleById(id: number): Vehicle | undefined;
}

export function createSim(options: SimOptions): Sim {
  const rng: Rng = createRng(options.seed);
  const stands = options.stands ?? STANDS;
  const standWeights = stands.map((s) => demandWeight(s));
  const callsPerMinute = options.callsPerMinute ?? DEFAULTS.callsPerMinute;
  const speedMps = ((options.speedKmh ?? DEFAULTS.speedKmh) * 1000) / 3600;
  const searchRadiusM = options.searchRadiusM ?? DEFAULTS.searchRadiusM;
  const maxCandidates = options.maxCandidates ?? DEFAULTS.maxCandidates;
  const ackTimeoutS = options.ackTimeoutS ?? DEFAULTS.ackTimeoutS;
  const backgroundAckFailRate = options.backgroundAckFailRate ?? DEFAULTS.backgroundAckFailRate;
  const radii = options.relocationRadiiM ?? DEFAULTS.relocationRadiiM;

  const startPosition = (): LatLng => {
    const base = pick(rng, stands);
    return {
      lat: base.lat + between(rng, -START_JITTER_DEG, START_JITTER_DEG),
      lng: base.lng + between(rng, -START_JITTER_DEG, START_JITTER_DEG),
    };
  };
  const usedPlates = new Set<string>();
  const newPlate = (): string => {
    for (;;) {
      const plate = `${intBetween(rng, 100, 999)}${pick(rng, KOR_CHARS)}${intBetween(rng, 1000, 9999)}`;
      if (!usedPlates.has(plate)) {
        usedPlates.add(plate);
        return plate;
      }
    }
  };
  const positions =
    options.vehiclePositions ?? Array.from({ length: options.vehicleCount ?? DEFAULTS.vehicleCount }, startPosition);
  const vehicles: Vehicle[] = positions.map((pos, i) => ({
    id: 1001 + i,
    plate: newPlate(),
    pos: { lat: pos.lat, lng: pos.lng },
    state: 'idle',
    target: null,
    callId: null,
    standIndex: null,
  }));
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const calls = new Map<number, Call>();
  let time = 0;
  let nextCallId = 1;
  let callDebt = 0;
  let dispatchedCount = 0;

  function candidates(point: LatLng, exclude: readonly number[] = []): Vehicle[] {
    return vehicles
      .filter((v) => (v.state === 'idle' || v.state === 'relocating') && !exclude.includes(v.id))
      .map((v) => ({ v, d: haversineMeters(point, v.pos) }))
      .filter((x) => x.d <= searchRadiusM)
      .sort((a, b) => a.d - b.d)
      .slice(0, maxCandidates)
      .map((x) => x.v);
  }

  function addCall(origin: LatLng, destination: LatLng, opts: AddCallOptions = {}): number {
    const id = nextCallId++;
    calls.set(id, {
      id,
      origin,
      destination,
      createdAt: time,
      status: 'searching',
      vehicleId: null,
      tried: [],
      reservedAt: null,
      ackAt: null,
      failFirstAck: opts.failFirstAck ?? false,
      manual: opts.manual ?? false,
      endedAt: null,
    });
    return id;
  }

  function dispatch(callId: number): SimEvent[] {
    const call = calls.get(callId);
    if (!call || call.status !== 'searching') return [];
    const nearest = candidates(call.origin, call.tried)[0];
    if (!nearest) {
      call.status = 'failed';
      call.endedAt = time;
      return [{ type: 'failed', callId }];
    }
    nearest.state = 'reserved';
    nearest.target = null;
    nearest.callId = callId;
    nearest.standIndex = null;
    call.status = 'reserved';
    call.vehicleId = nearest.id;
    call.reservedAt = time;
    const silent = (call.failFirstAck && call.tried.length === 0) || (!call.manual && rng() < backgroundAckFailRate);
    call.ackAt = silent ? null : time + between(rng, 1, 2);
    return [{ type: 'reserved', callId, vehicleId: nearest.id, distanceM: haversineMeters(call.origin, nearest.pos) }];
  }

  function randomOrigin(): LatLng {
    return jitter(rng, pickWeighted(rng, stands, standWeights), CALL_JITTER_M);
  }

  function randomTripDestination(origin: LatLng): LatLng {
    for (let i = 0; i < 30; i++) {
      const s = pick(rng, stands);
      const d = haversineMeters(origin, s);
      if (d >= TRIP_MIN_M && d <= TRIP_MAX_M) return jitter(rng, s, CALL_JITTER_M);
    }
    return jitter(rng, pick(rng, stands), CALL_JITTER_M);
  }

  function arrive(v: Vehicle, events: SimEvent[]) {
    const call = v.callId !== null ? calls.get(v.callId) : undefined;
    if (v.state === 'pickup' && call) {
      v.state = 'trip';
      v.target = call.destination;
      call.status = 'trip';
      events.push({ type: 'pickedUp', callId: call.id, vehicleId: v.id });
    } else if (v.state === 'trip' && call) {
      call.status = 'done';
      call.endedAt = time;
      calls.delete(call.id);
      const standIndex = chooseRelocationStand(v.pos, stands, standWeights, radii);
      const stand = stands[standIndex]!;
      v.state = 'relocating';
      v.callId = null;
      v.standIndex = standIndex;
      v.target = { lat: stand.lat, lng: stand.lng };
      events.push({ type: 'arrived', callId: call.id, vehicleId: v.id });
      events.push({ type: 'relocating', callId: call.id, vehicleId: v.id, standIndex });
    } else if (v.state === 'relocating') {
      v.state = 'idle';
      v.target = null;
      v.standIndex = null;
      events.push({ type: 'relocated', vehicleId: v.id });
    }
  }

  function tick(h: number, events: SimEvent[]) {
    callDebt += (callsPerMinute / 60) * h;
    while (callDebt >= 1) {
      callDebt -= 1;
      const origin = randomOrigin();
      const id = addCall(origin, randomTripDestination(origin));
      events.push({ type: 'call', callId: id });
      events.push(...dispatch(id));
    }
    for (const call of calls.values()) {
      if (call.status !== 'reserved' || call.reservedAt === null || call.vehicleId === null) continue;
      const v = byId.get(call.vehicleId)!;
      if (call.ackAt !== null && time >= call.ackAt) {
        v.state = 'pickup';
        v.target = call.origin;
        call.status = 'pickup';
        dispatchedCount++;
        events.push({ type: 'ackOk', callId: call.id, vehicleId: v.id });
      } else if (call.ackAt === null && time >= call.reservedAt + ackTimeoutS) {
        v.state = 'idle';
        v.callId = null;
        call.tried.push(v.id);
        call.status = 'searching';
        call.vehicleId = null;
        call.reservedAt = null;
        events.push({ type: 'ackTimeout', callId: call.id, vehicleId: v.id });
        events.push(...dispatch(call.id));
      }
    }
    const stepM = speedMps * h;
    for (const v of vehicles) {
      if (!v.target) continue;
      v.pos = moveToward(v.pos, v.target, stepM);
      if (v.pos.lat === v.target.lat && v.pos.lng === v.target.lng) arrive(v, events);
    }
    for (const call of calls.values()) {
      if (call.status === 'failed' && call.endedAt !== null && time - call.endedAt > FAILED_CALL_TTL_S) calls.delete(call.id);
    }
  }

  function step(dt: number): SimEvent[] {
    const events: SimEvent[] = [];
    let left = dt;
    while (left > 1e-9) {
      const h = Math.min(MAX_STEP_S, left);
      left -= h;
      time += h;
      tick(h, events);
    }
    return events;
  }

  function counts(): Record<CountKey, number> {
    const c: Record<CountKey, number> = { idle: 0, pickup: 0, trip: 0, relocating: 0 };
    for (const v of vehicles) c[v.state === 'reserved' ? 'pickup' : v.state]++;
    return c;
  }

  return {
    get time() {
      return time;
    },
    get dispatchedCount() {
      return dispatchedCount;
    },
    vehicles,
    calls,
    stands,
    standWeights,
    step,
    addCall,
    dispatch,
    candidates,
    counts,
    randomOrigin,
    randomTripDestination,
    vehicleById: (id) => byId.get(id),
  };
}
