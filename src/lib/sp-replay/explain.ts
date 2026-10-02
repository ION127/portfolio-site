import { RULES, type Classified } from './detect';
import { INSTRUMENTS } from './universe';

/** 분류 결과를 설명하는 근거. classify의 판정 순서를 그대로 따른다. */
export type Reason =
  | { kind: 'marketEtfs'; sectors: string[] }
  | { kind: 'marketSectors'; sectors: string[] }
  | { kind: 'isEtf' }
  | { kind: 'etfMoved'; etfs: { symbol: string; returnPct: number }[] }
  | { kind: 'peers'; count: number }
  | { kind: 'etfQuiet'; etfs: string[] }
  | { kind: 'noPeers' };

export function explain(h: Classified, anomalies: readonly Classified[]): Reason[] {
  if (h.eventType === 'MARKET') {
    return h.movingEtfSectors.length >= RULES.marketTrigger
      ? [{ kind: 'marketEtfs', sectors: h.movingEtfSectors }]
      : [{ kind: 'marketSectors', sectors: h.movingSectors }];
  }
  if (h.eventType === 'SECTOR') {
    const reasons: Reason[] = [];
    if (h.etf) reasons.push({ kind: 'isEtf' });
    const etfs = anomalies
      .filter((x) => x.etf && x.symbol !== h.symbol && x.sector === h.sector && x.direction === h.direction)
      .map((x) => ({ symbol: x.symbol, returnPct: x.returnPct }));
    if (etfs.length > 0) reasons.push({ kind: 'etfMoved', etfs });
    const peers = anomalies.filter((x) => !x.etf && h.peers.includes(x.symbol)).length;
    if (peers > 0) reasons.push({ kind: 'peers', count: peers });
    return reasons;
  }
  const etfs = INSTRUMENTS.filter((i) => i.etf && i.market === h.market && i.sector === h.sector).map((i) => i.symbol);
  return [{ kind: 'etfQuiet', etfs }, { kind: 'noPeers' }];
}
