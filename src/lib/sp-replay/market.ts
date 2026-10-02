import { between, createRng } from '../baro-sim/random';
import { INSTRUMENTS, type Instrument, type Market } from './universe';

/** 탐지에 쓰는 최근 봉 수(원본 lookback_days 기본값 20). */
export const WINDOW = 20;

interface Wave {
  a1: number;
  a2: number;
  p1: number;
  p2: number;
  noise: number;
}

export interface MarketState {
  /** 종목별 최근 WINDOW개 1분 수익률(%). 마지막이 가장 최근이다. */
  readonly returns: ReadonlyMap<string, readonly number[]>;
  /** market의 다음 봉을 만든다. moves에 있는 종목은 그 수익률로 덮어쓴다. */
  advance(market: Market, moves?: Readonly<Record<string, number>>): void;
  latest(symbol: string): number;
}

// 평온한 장: 20봉 · 10봉 주기 사인파 합. 20봉 창 안에서 평균이 0이고, 진폭비를 0.5 이하로 두면
// |Z| ≤ (1 + 0.5) / √(0.625 × 20/19) ≈ 1.85라 Z 2.0을 넘지 않는다. 잡음은 진폭의 1.5% 이하.
export function createMarket(seed: number, instruments: readonly Instrument[] = INSTRUMENTS): MarketState {
  const rng = createRng(seed);
  const waves = new Map<string, Wave>();
  const returns = new Map<string, number[]>();
  const bar: Record<Market, number> = { us: 0, kr: 0 };

  const background = (w: Wave, t: number) =>
    w.a1 * Math.sin((2 * Math.PI * t) / 20 + w.p1) +
    w.a2 * Math.sin((2 * Math.PI * t) / 10 + w.p2) +
    w.noise * between(rng, -1, 1);

  for (const ins of instruments) {
    const a1 = between(rng, 0.05, 0.22) * (ins.etf ? 0.6 : 1);
    const w: Wave = { a1, a2: a1 * between(rng, 0.2, 0.5), p1: between(rng, 0, 2 * Math.PI), p2: between(rng, 0, 2 * Math.PI), noise: a1 * 0.015 };
    waves.set(ins.symbol, w);
    returns.set(ins.symbol, Array.from({ length: WINDOW }, (_, t) => background(w, t)));
  }
  bar.us = WINDOW;
  bar.kr = WINDOW;

  function advance(market: Market, moves: Readonly<Record<string, number>> = {}) {
    const t = bar[market]++;
    for (const ins of instruments) {
      if (ins.market !== market) continue;
      const r = moves[ins.symbol] ?? background(waves.get(ins.symbol)!, t);
      const w = returns.get(ins.symbol)!;
      w.push(r);
      w.shift();
    }
  }

  return {
    returns,
    advance,
    latest: (symbol) => {
      const w = returns.get(symbol);
      return w ? w[w.length - 1]! : 0;
    },
  };
}
