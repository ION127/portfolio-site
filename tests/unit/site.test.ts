import { describe, expect, it } from 'vitest';
import { PROJECT_SECTIONS, PROJECT_SLUGS, SITE } from '../../src/lib/site';

describe('site constants', () => {
  it('lists the eight case-study sections in reading order', () => {
    expect(PROJECT_SECTIONS).toEqual([
      'overview',
      'architecture',
      'demo',
      'ops',
      'decisions',
      'infra',
      'contribution',
      'retrospective',
    ]);
  });

  it('has unique project slugs and both author names', () => {
    expect(new Set(PROJECT_SLUGS).size).toBe(PROJECT_SLUGS.length);
    expect(SITE.author.ko).toBe('신중훈');
    expect(SITE.author.en).toBe('Shin JoongHoon');
  });
});
