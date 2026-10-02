import { describe, expect, it } from 'vitest';
import { classify, type Anomaly } from '../../src/lib/sp-replay/detect';
import { explain } from '../../src/lib/sp-replay/explain';
import { formatPct, formatSigned } from '../../src/lib/sp-replay/format';
import { instrument } from '../../src/lib/sp-replay/universe';

const a = (symbol: string, returnPct: number): Anomaly => {
  const ins = instrument(symbol)!;
  return { symbol, market: ins.market, sector: ins.sector, etf: ins.etf, returnPct, zscore: 3, direction: returnPct > 0 ? 'up' : 'down' };
};
const reasonsFor = (list: Anomaly[], symbol: string) => {
  const all = classify(list);
  return explain(all.find((x) => x.symbol === symbol)!, all);
};

describe('number labels', () => {
  it('use the same minus sign for returns and z-scores', () => {
    expect(formatPct(3.4)).toBe('+3.4%');
    expect(formatPct(-4.3)).toBe('−4.3%');
    expect(formatPct(0)).toBe('0.0%');
    expect(formatSigned(-4.24)).toBe('−4.2');
    expect(formatSigned(2.06)).toBe('+2.1');
  });
});

describe('classification reasons', () => {
  it('say the sector ETFs stayed quiet for a single-stock event', () => {
    expect(reasonsFor([a('NVDA', 3.4)], 'NVDA')).toEqual([{ kind: 'etfQuiet', etfs: ['SMH', 'SOXX'] }, { kind: 'noPeers' }]);
  });

  it('name the sector ETF and count the peers that moved with a sector event', () => {
    const list = [a('KR:005930', -4.3), a('KR:000660', -4.8), a('KR:091160', -2.6)];
    expect(reasonsFor(list, 'KR:005930')).toEqual([
      { kind: 'etfMoved', etfs: [{ symbol: 'KR:091160', returnPct: -2.6 }] },
      { kind: 'peers', count: 1 },
    ]);
  });

  it('do not list an ETF as moving alongside itself', () => {
    expect(reasonsFor([a('SMH', 2.1), a('SOXX', 2.3)], 'SMH')).toEqual([
      { kind: 'isEtf' },
      { kind: 'etfMoved', etfs: [{ symbol: 'SOXX', returnPct: 2.3 }] },
    ]);
  });

  it('cite the sector ETFs when they make it market-wide', () => {
    const list = [a('SMH', -2.1), a('XLK', -1.8), a('XLF', -1.6), a('XLY', -1.6), a('AAPL', -3.2)];
    expect(reasonsFor(list, 'AAPL')).toEqual([{ kind: 'marketEtfs', sectors: ['semi', 'tech', 'fin', 'consumer'] }]);
  });

  it('cite the moving sectors when stocks alone make it market-wide', () => {
    expect(reasonsFor([a('NVDA', 3.2), a('JPM', 3.1), a('XOM', 3.5)], 'NVDA')).toEqual([
      { kind: 'marketSectors', sectors: ['semi', 'fin', 'energy'] },
    ]);
  });
});
