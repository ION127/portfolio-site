import { describe, expect, it } from 'vitest';
import { SCENES } from '../../src/lib/sp-replay/scenes';
import { createPlayer, type Phase } from '../../src/lib/sp-replay/player';
import { classify, detectLatest } from '../../src/lib/sp-replay/detect';
import { createMarket } from '../../src/lib/sp-replay/market';
import { instrument } from '../../src/lib/sp-replay/universe';

describe('scenes', () => {
  it('produce an individual, a sector and a market-wide event through the real rules', () => {
    const expected = { individual: 'INDIVIDUAL', sector: 'SECTOR', market: 'MARKET' };
    for (const scene of SCENES) {
      const m = createMarket(2026);
      for (let i = 0; i < 7; i++) m.advance(scene.market);
      m.advance(scene.market, scene.moves);
      const found = classify(detectLatest(scene.market, m.returns));
      expect(found.map((x) => x.symbol).sort()).toEqual(Object.keys(scene.moves).sort());
      expect(found.find((x) => x.symbol === scene.headline)!.eventType).toBe(expected[scene.id]);
    }
  });

  it('tell the market-wide story with numbers that match the board', () => {
    const market = SCENES.find((s) => s.id === 'market')!;
    const etfMoves = Object.entries(market.moves)
      .filter(([symbol]) => instrument(symbol)!.etf)
      .map(([, r]) => Math.abs(r));
    expect(etfMoves).toHaveLength(4);
    // 분석 문장은 섹터 ETF 네 개가 "1.5% 넘게" 내렸다고 말한다.
    expect(market.analysis.ko).toContain('1.5% 넘게');
    expect(Math.min(...etfMoves)).toBeGreaterThan(1.5);
  });

  it('mark their news and analysis as examples', () => {
    for (const scene of SCENES) {
      for (const line of [...scene.news.ko, scene.analysis.ko]) expect(line).toContain('(예시)');
      for (const line of [...scene.news.en, scene.analysis.en]) expect(line).toContain('(example)');
    }
  });
});

describe('player', () => {
  function cycle() {
    const p = createPlayer();
    const phases: Phase[] = [p.phase];
    const scenes: string[] = [p.scene.id];
    for (let i = 0; i < 4000 && scenes.length < 4; i++) {
      const before = p.phase;
      p.tick(0.05);
      if (p.phase !== before) {
        phases.push(p.phase);
        if (p.phase === 'board') scenes.push(p.scene.id);
      }
    }
    return { p, phases, scenes };
  }

  it('walks every scene through the pipeline, with the Groq 429 wait-and-retry only in the sector scene', () => {
    const { phases, scenes } = cycle();
    expect(scenes).toEqual(['individual', 'sector', 'market', 'individual']);
    const story = ['detect', 'classify', 'news', 'analyze', 'notify'];
    expect(phases).toEqual([
      'board', ...story,
      'board', 'detect', 'classify', 'news', 'retry', 'analyze', 'notify',
      'board', ...story,
      'board',
    ]);
  });

  it('counts every detected anomaly and follows the headline ticker', () => {
    const p = createPlayer();
    for (let i = 0; i < 2000 && p.phase !== 'classify'; i++) p.tick(0.05);
    expect(p.headline).toMatchObject({ symbol: 'NVDA', eventType: 'INDIVIDUAL' });
    const { p: done } = cycle();
    expect(done.detections).toBe(SCENES.reduce((n, s) => n + Object.keys(s.moves).length, 0));
  });

  it('catches the same tickers with the same verdict on later rounds', () => {
    // 앞 바퀴의 급등락이 20봉 창에 남아 있어도 장면마다 결과가 같아야 한다.
    // 한국 장면은 8봉마다 돌아와 셋째 바퀴부터 창에 급락이 3개 쌓인다. 다섯 바퀴면 쌓임이 더 늘지 않는다.
    const p = createPlayer();
    const seen: string[] = [];
    for (let i = 0; i < 40_000 && seen.length < 15; i++) {
      const before = p.phase;
      p.tick(0.05);
      if (before !== 'classify' && p.phase === 'classify') {
        const symbols = p.anomalies.map((a) => a.symbol).sort().join(',');
        seen.push(`${p.scene.id}:${p.headline!.eventType}:${symbols}`);
      }
    }
    expect(seen).toHaveLength(15);
    for (let round = 1; round < 5; round++) expect(seen.slice(round * 3, round * 3 + 3)).toEqual(seen.slice(0, 3));
  });

  it('keeps the board still while it explains a step', () => {
    const p = createPlayer();
    for (let i = 0; i < 2000 && p.phase !== 'detect'; i++) p.tick(0.05);
    const before = p.market.latest('MSFT');
    for (let i = 0; i < 20; i++) p.tick(0.05);
    expect(p.market.latest('MSFT')).toBe(before);
  });
});
