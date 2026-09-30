import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { load } from 'js-yaml';

const ROOT = 'src/content';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
function relFiles(collection: string, locale: string): string[] {
  const base = join(ROOT, collection, locale);
  return files(base)
    .map((f) => relative(base, f).replaceAll('\\', '/'))
    .sort();
}
function frontmatter(path: string): Record<string, unknown> {
  const m = readFileSync(path, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? ((load(m[1]) as Record<string, unknown> | null) ?? {}) : {};
}
function yaml(path: string): Record<string, unknown> {
  return load(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('ko/en content parity', () => {
  for (const collection of ['projects', 'sections', 'incidents', 'decisions']) {
    it(`${collection}: every Korean file has an English twin`, () => {
      expect(relFiles(collection, 'en')).toEqual(relFiles(collection, 'ko'));
    });
  }

  it('home exists in both languages', () => {
    expect(readdirSync(join(ROOT, 'home')).sort()).toEqual(['en.yaml', 'ko.yaml']);
  });

  it('incidents and decisions keep project, order, highlight and confirmed in both languages', () => {
    for (const collection of ['incidents', 'decisions']) {
      for (const f of relFiles(collection, 'ko')) {
        const ko = frontmatter(join(ROOT, collection, 'ko', f));
        const en = frontmatter(join(ROOT, collection, 'en', f));
        for (const key of ['project', 'order', 'highlight', 'confirmed']) {
          expect(en[key], `${collection}/${f} ${key}`).toEqual(ko[key]);
        }
      }
    }
  });

  it('projects keep the same structural fields in both languages', () => {
    for (const f of relFiles('projects', 'ko')) {
      const ko = yaml(join(ROOT, 'projects', 'ko', f));
      const en = yaml(join(ROOT, 'projects', 'en', f));
      for (const key of ['order', 'diagram', 'miniScene', 'pipelineScene', 'tags', 'metaChips']) {
        expect(en[key], `${f} ${key}`).toEqual(ko[key]);
      }
      const hrefs = (v: unknown) => (v as { href: string }[]).map((l) => l.href);
      expect(hrefs(en.links)).toEqual(hrefs(ko.links));
    }
  });

  it('home metrics share values, projects and fact ids across languages', () => {
    type Home = { metrics: { value: string; factId: string; project: string }[]; stack: unknown; contacts: unknown };
    const ko = yaml(join(ROOT, 'home', 'ko.yaml')) as unknown as Home;
    const en = yaml(join(ROOT, 'home', 'en.yaml')) as unknown as Home;
    const pick = (h: Home) => h.metrics.map((m) => [m.value, m.factId, m.project]);
    expect(pick(en)).toEqual(pick(ko));
    expect(en.stack).toEqual(ko.stack);
    expect(en.contacts).toEqual(ko.contacts);
  });
});
