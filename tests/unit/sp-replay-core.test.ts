import { describe, expect, it } from 'vitest';
import { INSTRUMENTS, SECTORS, instrument } from '../../src/lib/sp-replay/universe';
import { createMarket, WINDOW } from '../../src/lib/sp-replay/market';
import { classify, detectLatest, RULES, zscore, type Anomaly } from '../../src/lib/sp-replay/detect';

const calm = (last: number) => [...Array.from({ length: 19 }, (_, i) => (i % 2 === 0 ? 0.05 : -0.05)), last];
const wide = (last: number) => [...Array.from({ length: 19 }, (_, i) => (i % 2 === 0 ? 3 : -3)), last];
const a = (symbol: string, direction: 'up' | 'down'): Anomaly => {
  const ins = instrument(symbol)!;
  return { symbol, market: ins.market, sector: ins.sector, etf: ins.etf, returnPct: direction === 'up' ? 2 : -2, zscore: 3, direction };
};

describe('universe', () => {
  it('has the 108 tickers of the real service in 10 sectors', () => {
    expect(SECTORS).toHaveLength(10);
    expect(INSTRUMENTS).toHaveLength(108);
    expect(INSTRUMENTS.filter((i) => i.market === 'us')).toHaveLength(68);
    expect(INSTRUMENTS.filter((i) => i.market === 'kr')).toHaveLength(40);
    expect(new Set(INSTRUMENTS.map((i) => i.symbol)).size).toBe(108);
    for (const s of SECTORS) {
      expect(INSTRUMENTS.filter((i) => i.sector === s.id && i.market === 'us' && i.etf)).toHaveLength(2);
      expect(INSTRUMENTS.filter((i) => i.sector === s.id && i.market === 'kr' && i.etf)).toHaveLength(1);
      expect(INSTRUMENTS.filter((i) => i.sector === s.id && i.market === 'kr' && !i.etf)).toHaveLength(3);
    }
    // 실제 분류 함수처럼 AMZN · TSLA는 마지막 섹터(소비재)로 본다.
    expect(instrument('AMZN')!.sector).toBe('consumer');
    expect(instrument('TSLA')!.sector).toBe('consumer');
    expect(instrument('KR:005930')!.name.ko).toBe('삼성전자');
  });
});

describe('detection (production settings)', () => {
  it('uses the deployed thresholds', () => {
    expect(RULES).toMatchObject({ pct: { us: 3.0, kr: 4.0 }, z: 2.0, lookback: 20 });
  });

  it('computes the z-score with the sample standard deviation', () => {
    expect(zscore([...Array(19).fill(0), 1])).toBeCloseTo(4.249, 2);
    expect(zscore(Array(20).fill(0.3))).toBe(0);
  });

  it('flags a move by percent or by z-score, with separate US and Korean percent thresholds', () => {
    const returns = new Map<string, number[]>([
      ['NVDA', wide(3.0)], // 3.0% 이상
      ['AMD', wide(2.99)], // 기준 미만, 변동성이 커서 Z도 낮음
      ['MSFT', calm(0.5)], // 작은 움직임이지만 Z가 큼
      ['KR:005930', wide(3.9)], // 한국은 4.0% 기준
      ['KR:000660', wide(-4.0)],
    ]);
    expect(detectLatest('us', returns).map((x) => x.symbol).sort()).toEqual(['MSFT', 'NVDA']);
    expect(detectLatest('kr', returns)).toEqual([expect.objectContaining({ symbol: 'KR:000660', direction: 'down' })]);
  });
});

describe('classification (ported from classify_event_type)', () => {
  const type = (list: Anomaly[], symbol: string) => classify(list).find((x) => x.symbol === symbol)!.eventType;
  it('calls a lone mover an individual event', () => {
    expect(type([a('NVDA', 'up')], 'NVDA')).toBe('INDIVIDUAL');
  });
  it('calls it a sector event when its sector ETF, a peer, or the ETF itself moves', () => {
    expect(type([a('NVDA', 'up'), a('SMH', 'up')], 'NVDA')).toBe('SECTOR');
    expect(type([a('NVDA', 'up'), a('AMD', 'up')], 'NVDA')).toBe('SECTOR');
    expect(type([a('SMH', 'up')], 'SMH')).toBe('SECTOR');
  });
  it('ignores moves in the other direction', () => {
    expect(type([a('NVDA', 'up'), a('SMH', 'down'), a('AMD', 'down')], 'NVDA')).toBe('INDIVIDUAL');
  });
  it('calls it market-wide when ETFs in three sectors, or three sectors, move together', () => {
    expect(type([a('AAPL', 'down'), a('XLK', 'down'), a('XLF', 'down'), a('XLE', 'down')], 'AAPL')).toBe('MARKET');
    expect(type([a('NVDA', 'up'), a('JPM', 'up'), a('XOM', 'up')], 'NVDA')).toBe('MARKET');
  });
});

describe('calm background market', () => {
  it('never trips the detector on its own', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const m = createMarket(seed);
      for (let bar = 0; bar < 300; bar++) {
        for (const market of ['us', 'kr'] as const) {
          m.advance(market);
          expect(detectLatest(market, m.returns)).toEqual([]);
        }
      }
    }
  });

  it('keeps a full window per ticker and is deterministic', () => {
    const run = () => {
      const m = createMarket(7);
      for (let i = 0; i < 50; i++) m.advance('us');
      return INSTRUMENTS.map((i) => m.latest(i.symbol).toFixed(6)).join(',');
    };
    expect(run()).toBe(run());
    expect(createMarket(7).returns.get('NVDA')).toHaveLength(WINDOW);
  });

  it('applies injected moves and settles afterwards without false alarms', () => {
    const m = createMarket(3);
    m.advance('us', { NVDA: 3.4 });
    expect(m.latest('NVDA')).toBe(3.4);
    expect(detectLatest('us', m.returns).map((x) => x.symbol)).toEqual(['NVDA']);
    for (let i = 0; i < 25; i++) {
      m.advance('us');
      expect(detectLatest('us', m.returns)).toEqual([]);
    }
  });
});
