import { describe, expect, it } from 'vitest';
import { assertValidSpec, validateSpec } from '../../src/lib/diagram/validate';
import { both, type DiagramSpec } from '../../src/lib/diagram/types';

function fixture(): DiagramSpec {
  return {
    id: 'fx',
    width: 400,
    height: 200,
    title: both('Fixture'),
    zones: [{ id: 'z', x: 0, y: 0, w: 400, h: 200, label: both('Zone'), tone: 'cloud' }],
    tunnels: [{ id: 'vpn', x: 180, y: 20, w: 40, h: 160, label: 'VPN' }],
    nodes: [
      { id: 'a', x: 10, y: 20, title: both('A'), sub: both('a') },
      { id: 'b', x: 250, y: 20, title: both('B'), sub: both('b') },
    ],
    edges: [{ id: 'ab', d: 'M140,43 L250,43' }],
    chapters: [both('Intro')],
    steps: [{ chapter: 0, nodes: ['a', 'b', 'vpn'], routes: [['ab'], ['-ab']], text: both('A to B') }],
  };
}

describe('assertValidSpec', () => {
  it('stops the build with the problems of a broken diagram', () => {
    const broken = fixture();
    broken.steps[0]!.nodes.push('ghost');
    expect(() => assertValidSpec(broken)).toThrow(/fx diagram[\s\S]*ghost/);
    expect(() => assertValidSpec(fixture())).not.toThrow();
  });
});

describe('validateSpec', () => {
  it('accepts a consistent spec', () => {
    expect(validateSpec(fixture())).toEqual([]);
  });

  it('reports unknown nodes and edges referenced by steps', () => {
    const s = fixture();
    s.steps[0].nodes.push('ghost');
    s.steps[0].routes.push(['-nope']);
    expect(validateSpec(s)).toEqual(
      expect.arrayContaining(['step 0 references unknown node ghost', 'step 0 references unknown edge nope']),
    );
  });

  it('reports missing translations', () => {
    const s = fixture();
    s.steps[0].text = { ko: '가', en: '' };
    s.nodes[0].title = { ko: '', en: 'A' };
    expect(validateSpec(s)).toEqual(expect.arrayContaining(['step 0 missing text.en', 'node a missing title.ko']));
  });

  it('reports shapes outside the canvas and unsupported paths', () => {
    const s = fixture();
    s.nodes[1].x = 350;
    s.edges.push({ id: 'curve', d: 'M0,0 C1,1 2,2 3,3' });
    const errors = validateSpec(s);
    expect(errors).toContain('node b is outside the canvas');
    expect(errors.some((e) => e.startsWith('edge curve:'))).toBe(true);
  });

  it('reports duplicate ids, empty routes and bad chapter numbers', () => {
    const s = fixture();
    s.nodes.push({ ...s.nodes[0] });
    s.steps.push({ chapter: 3, nodes: [], routes: [[]], text: both('x') });
    expect(validateSpec(s)).toEqual(
      expect.arrayContaining(['duplicate node id: a', 'step 1 route 0 is empty', 'step 1 has invalid chapter 3']),
    );
  });

  it('accepts a route that passes through a node and reports one that jumps between edges', () => {
    const s = fixture();
    s.edges.push({ id: 'bx', d: 'M380,43 L395,43' });
    // b의 왼쪽(250,43)으로 들어가 오른쪽(380,43)으로 나간다: 노드를 지나가는 정상 경로
    s.steps[0].routes.push(['ab', 'bx']);
    expect(validateSpec(s)).toEqual([]);
    // b에 도착한 뒤 a의 오른쪽(140,43)에서 다시 출발한다: 점이 순간이동한다
    s.steps[0].routes.push(['ab', 'ab']);
    expect(validateSpec(s)).toEqual(['step 0 route 3 breaks between ab and ab']);
  });
});
