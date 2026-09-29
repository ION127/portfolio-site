import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { parseFactIds } from '../../src/lib/facts';

describe('parseFactIds', () => {
  it('reads ids from the first column and skips header rows', () => {
    const md = [
      '| id | 내용 | 출처 | 확인 |',
      '|---|---|---|---|',
      '| baro.vehicles | 1,500대 | baro-edge/config.py | 초안 |',
      '| stockpulse.topic-count | 7개 | services/ | 확정 |',
      'not a table line',
    ].join('\n');
    expect(parseFactIds(md)).toEqual(['baro.vehicles', 'stockpulse.topic-count']);
  });
});

describe('docs/facts.md', () => {
  const ids = parseFactIds(readFileSync('docs/facts.md', 'utf8'));

  it('has unique ids', () => {
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('backs every home metric with a ledger entry', () => {
    for (const file of readdirSync('src/content/home')) {
      const home = load(readFileSync(`src/content/home/${file}`, 'utf8')) as { metrics: { factId: string }[] };
      for (const m of home.metrics) expect(ids, `${file}: ${m.factId}`).toContain(m.factId);
    }
  });
});
