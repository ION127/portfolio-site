import { classify, detectLatest, type Classified } from './detect';
import { createMarket, type MarketState } from './market';
import { SCENES, type Scene } from './scenes';

export type Phase = 'board' | 'detect' | 'classify' | 'news' | 'retry' | 'analyze' | 'notify';
/** 해설 카드의 단계 점(429 재시도는 분석 단계에 포함해 보여 준다) */
export const STEP_PHASES = ['detect', 'classify', 'news', 'analyze', 'notify'] as const;

export const TIMING = {
  barS: 0.6,
  /**
   * 장면마다 몇 번째 봉에 급등락을 심는지. 한국 장면은 이 간격으로 돌아오므로 KODEX 반도체(−2.6%, Z로만 잡힘)의
   * 급락이 20봉 창에 쌓인다. 8이면 셋까지 쌓여 Z ≈ 2.3으로 잡히지만 6 이하면 넷이 쌓여 2 아래로 떨어진다.
   * (테스트 'catches the same tickers with the same verdict on later rounds'가 지킨다)
   */
  boardBars: 8,
  detect: 2.2,
  classify: 3.0,
  news: 2.6,
  retry: 2.6,
  analyze: 3.2,
  notify: 2.6,
};

export interface Player {
  readonly phase: Phase;
  readonly scene: Scene;
  readonly sceneIndex: number;
  readonly market: MarketState;
  readonly anomalies: readonly Classified[];
  readonly headline: Classified | null;
  readonly detections: number;
  /** 장 시계(0시부터 분) */
  readonly minute: number;
  readonly phaseElapsed: number;
  /** 화면을 다시 그려야 할 때마다 1씩 오른다(봉 · 단계 변화). */
  readonly version: number;
  tick(wallDt: number): void;
}

export function createPlayer(seed = 2026): Player {
  const market = createMarket(seed);
  let sceneIndex = 0;
  let phase: Phase = 'board';
  let elapsed = 0;
  let barClock = 0;
  let barsInScene = 0;
  let anomalies: Classified[] = [];
  let detections = 0;
  let minute = SCENES[0]!.startMinute;
  let version = 0;
  const scene = () => SCENES[sceneIndex]!;

  function go(next: Phase) {
    phase = next;
    elapsed = 0;
    version++;
  }

  function startScene(index: number) {
    sceneIndex = index % SCENES.length;
    barsInScene = 0;
    barClock = 0;
    anomalies = [];
    minute = scene().startMinute;
    go('board');
  }

  function nextBar() {
    const s = scene();
    barsInScene += 1;
    minute += 1;
    market.advance(s.market, barsInScene === TIMING.boardBars ? s.moves : undefined);
    version++;
    const found = detectLatest(s.market, market.returns);
    if (found.length > 0) {
      detections += found.length;
      anomalies = classify(found);
      go('detect');
    } else if (barsInScene > TIMING.boardBars + 5) {
      startScene(sceneIndex + 1); // 장면 값이 잡히지 않는 일은 없어야 하지만, 멈추지 않게 다음 장면으로 간다
    }
  }

  const after: Record<Exclude<Phase, 'board'>, () => void> = {
    detect: () => go('classify'),
    classify: () => go('news'),
    news: () => go(scene().retry ? 'retry' : 'analyze'),
    retry: () => go('analyze'),
    analyze: () => go('notify'),
    notify: () => startScene(sceneIndex + 1),
  };

  function tick(wallDt: number) {
    elapsed += wallDt;
    if (phase === 'board') {
      barClock += wallDt;
      while (phase === 'board' && barClock >= TIMING.barS) {
        barClock -= TIMING.barS;
        nextBar();
      }
    } else if (elapsed >= TIMING[phase]) {
      after[phase]();
    }
  }

  return {
    get phase() {
      return phase;
    },
    get scene() {
      return scene();
    },
    get sceneIndex() {
      return sceneIndex;
    },
    market,
    get anomalies() {
      return anomalies;
    },
    get headline() {
      return anomalies.find((a) => a.symbol === scene().headline) ?? anomalies[0] ?? null;
    },
    get detections() {
      return detections;
    },
    get minute() {
      return minute;
    },
    get phaseElapsed() {
      return elapsed;
    },
    get version() {
      return version;
    },
    tick,
  };
}
