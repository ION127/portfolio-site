import { nearestArea, type Area } from './demand';
import type { LatLng } from './geo';
import type { Sim, SimEvent } from './engine';

export type Phase = 'overview' | 'call' | 'search' | 'reserve' | 'ack' | 'pickup' | 'trip' | 'relocate';
export const SPOTLIGHT_PHASES = ['call', 'search', 'reserve', 'ack', 'pickup', 'trip', 'relocate'] as const;

/** 단계별 배속(시뮬레이션 초 / 실제 초). 0은 설명하는 동안 시뮬레이션을 멈춘다는 뜻이다. */
export const TIME_SCALE: Record<Phase, number> = {
  overview: 30,
  call: 0,
  search: 0,
  reserve: 0,
  ack: 1,
  pickup: 60,
  trip: 60,
  relocate: 30,
};
/** 응답하지 않을 차의 ACK 10초를 기다리는 동안의 배속. */
export const ACK_WAIT_SCALE = 2;

export interface DirectorTiming {
  overviewS: number;
  callS: number;
  searchS: number;
  reserveS: number;
  relocateS: number;
  failEvery: number;
}
export const DEFAULT_TIMING: DirectorTiming = { overviewS: 4, callS: 1.6, searchS: 1.6, reserveS: 1.2, relocateS: 2.2, failEvery: 3 };

export interface Spotlight {
  callId: number;
  origin: LatLng;
  destination: LatLng;
  area: Area | null;
  vehicleId: number | null;
  distanceM: number | null;
  candidateIds: number[];
  /** 이번 따라가기에서 ACK 시간 초과가 한 번 있었는지. */
  ackFailed: boolean;
  /** 지금 예약된 차가 응답하지 않을 차인지. */
  waitingSilent: boolean;
  standIndex: number | null;
}

export interface Director {
  readonly phase: Phase;
  readonly timeScale: number;
  readonly spotlight: Spotlight | null;
  readonly spotlightCount: number;
  /** 실제 시간 wallDt초만큼 진행한다. 시뮬레이션도 지금 배속으로 함께 움직인다. */
  tick(wallDt: number): SimEvent[];
}

export function createDirector(sim: Sim, timing: DirectorTiming = DEFAULT_TIMING): Director {
  let phase: Phase = 'overview';
  let elapsed = 0;
  let spotlight: Spotlight | null = null;
  let count = 0;

  const timeScale = () => (phase === 'ack' && spotlight?.waitingSilent ? ACK_WAIT_SCALE : TIME_SCALE[phase]);

  function go(next: Phase) {
    phase = next;
    elapsed = 0;
  }

  function end() {
    spotlight = null;
    go('overview');
  }

  function startSpotlight() {
    count += 1;
    const forceFail = count % timing.failEvery === 0;
    const need = forceFail ? 2 : 1;
    let origin = sim.randomOrigin();
    for (let i = 0; i < 40 && sim.candidates(origin).length < need; i++) origin = sim.randomOrigin();
    if (sim.candidates(origin).length < need) {
      go('overview'); // 빈 차가 모자라면 다음 차례에 다시 고른다
      return;
    }
    const destination = sim.randomTripDestination(origin);
    const callId = sim.addCall(origin, destination, { manual: true, failFirstAck: forceFail });
    spotlight = {
      callId,
      origin,
      destination,
      area: nearestArea(origin),
      vehicleId: null,
      distanceM: null,
      candidateIds: [],
      ackFailed: false,
      waitingSilent: false,
      standIndex: null,
    };
    go('call');
  }

  function onEvent(e: SimEvent) {
    const s = spotlight;
    if (!s || !('callId' in e) || e.callId !== s.callId) return;
    if (e.type === 'reserved') {
      s.vehicleId = e.vehicleId;
      s.distanceM = e.distanceM;
      s.waitingSilent = sim.calls.get(s.callId)?.ackAt === null;
    } else if (e.type === 'ackTimeout') {
      s.ackFailed = true;
    } else if (e.type === 'ackOk') {
      s.waitingSilent = false;
      go('pickup');
    } else if (e.type === 'pickedUp') {
      go('trip');
    } else if (e.type === 'relocating') {
      s.standIndex = e.standIndex;
      go('relocate');
    } else if (e.type === 'failed') {
      end();
    }
  }

  function tick(wallDt: number): SimEvent[] {
    elapsed += wallDt;
    const events = sim.step(wallDt * timeScale());
    const s = spotlight;
    if (phase === 'overview' && elapsed >= timing.overviewS) {
      startSpotlight();
    } else if (phase === 'call' && s && elapsed >= timing.callS) {
      s.candidateIds = sim.candidates(s.origin).map((v) => v.id);
      go('search');
    } else if (phase === 'search' && s && elapsed >= timing.searchS) {
      go('reserve');
      events.push(...sim.dispatch(s.callId));
    } else if (phase === 'reserve' && elapsed >= timing.reserveS) {
      go('ack');
    } else if (phase === 'relocate' && elapsed >= timing.relocateS) {
      end();
    }
    for (const e of events) onEvent(e);
    return events;
  }

  return {
    get phase() {
      return phase;
    },
    get timeScale() {
      return timeScale();
    },
    get spotlight() {
      return spotlight;
    },
    get spotlightCount() {
      return count;
    },
    tick,
  };
}
