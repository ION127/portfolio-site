import { INSTRUMENTS, type Instrument, type Market } from './universe';

// 운영 설정(k8s/configmap.yaml)과 원본 함수(core/stock_fetcher.py)의 값.
export const RULES = {
  pct: { us: 3.0, kr: 4.0 } as Record<Market, number>, // ANOMALY_THRESHOLD_PERCENT, kr_percent_threshold
  z: 2.0, // ANOMALY_ZSCORE_THRESHOLD
  lookback: 20, // detect_anomalies lookback_days
  sectorTrigger: 2, // classify_event_type sector_trigger_count
  marketTrigger: 3, // classify_event_type market_trigger_sectors
};

export type Direction = 'up' | 'down';
export type EventType = 'INDIVIDUAL' | 'SECTOR' | 'MARKET';

export interface Anomaly {
  symbol: string;
  market: Market;
  sector: string;
  etf: boolean;
  returnPct: number;
  zscore: number;
  direction: Direction;
}

export interface Classified extends Anomaly {
  eventType: EventType;
  /** 같은 방향으로 움직인 섹터 ETF가 속한 섹터 */
  movingEtfSectors: string[];
  /** 같은 방향으로 움직인 섹터 */
  movingSectors: string[];
  /** 같은 섹터 · 같은 방향으로 함께 움직인 다른 종목 */
  peers: string[];
}

/** 마지막 값의 Z-score. pandas처럼 표본표준편차(n − 1)를 쓴다. */
export function zscore(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((s, x) => s + x, 0) / n;
  const std = Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  // 값이 모두 같은 창은 합의 부동소수 오차로 std가 1e-17 정도 남는다. 변동이 없는 것으로 본다.
  return std > 1e-9 ? (values[n - 1]! - mean) / std : 0;
}

/** market의 마지막 봉에서 이상값을 찾는다. 등락률 기준 또는 Z 기준 중 하나만 넘어도 이상값이다(원본의 OR). */
export function detectLatest(
  market: Market,
  returns: ReadonlyMap<string, readonly number[]>,
  instruments: readonly Instrument[] = INSTRUMENTS,
): Anomaly[] {
  const out: Anomaly[] = [];
  for (const ins of instruments) {
    if (ins.market !== market) continue;
    const w = (returns.get(ins.symbol) ?? []).slice(-RULES.lookback);
    if (w.length < 5) continue;
    const ret = w[w.length - 1]!;
    const z = zscore(w);
    if (Math.abs(ret) >= RULES.pct[market] || Math.abs(z) >= RULES.z) {
      out.push({
        symbol: ins.symbol,
        market,
        sector: ins.sector,
        etf: ins.etf,
        returnPct: Math.round(ret * 100) / 100,
        zscore: Math.round(z * 100) / 100,
        direction: ret > 0 ? 'up' : 'down',
      });
    }
  }
  return out;
}

/** 원본 classify_event_type과 같은 순서로 판정한다. anomalies는 같은 묶음(같은 시각)의 이상값이다. */
export function classify(anomalies: readonly Anomaly[]): Classified[] {
  return anomalies.map((a) => {
    const same = anomalies.filter((x) => x.direction === a.direction);
    const movingEtfSectors = [...new Set(same.filter((x) => x.etf).map((x) => x.sector))];
    const peers = same.filter((x) => x.sector === a.sector && x.symbol !== a.symbol).map((x) => x.symbol);
    const movingSectors = [...new Set(same.map((x) => x.sector))];
    let eventType: EventType;
    if (movingEtfSectors.length >= RULES.marketTrigger) eventType = 'MARKET';
    else if (movingSectors.length >= RULES.marketTrigger) eventType = 'MARKET';
    else if (a.etf) eventType = 'SECTOR';
    else if (movingEtfSectors.includes(a.sector)) eventType = 'SECTOR';
    else if (peers.length >= RULES.sectorTrigger - 1) eventType = 'SECTOR';
    else eventType = 'INDIVIDUAL';
    return { ...a, eventType, movingEtfSectors, movingSectors, peers };
  });
}
