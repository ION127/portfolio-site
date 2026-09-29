import { describe, expect, it } from 'vitest';
import {
  buildRoute,
  parsePath,
  parseRef,
  pointAt,
  pointOnRoute,
  polylineLength,
  routeDuration,
} from '../../src/lib/diagram/routes';
import type { Edge } from '../../src/lib/diagram/types';

describe('parsePath', () => {
  it('reads absolute M/L commands with comma or space separators', () => {
    expect(parsePath('M175,133 L225,133')).toEqual([
      { x: 175, y: 133 },
      { x: 225, y: 133 },
    ]);
    expect(parsePath('M10 20 L30 40 L30 50')).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 30, y: 50 },
    ]);
    expect(parsePath(' M1.5,2 L3,4.25 ')).toEqual([
      { x: 1.5, y: 2 },
      { x: 3, y: 4.25 },
    ]);
  });

  it('rejects curves, relative commands and paths without two points', () => {
    expect(() => parsePath('M0,0 C1,1 2,2 3,3')).toThrow(/Unsupported/);
    expect(() => parsePath('M0,0 l10,0')).toThrow(/Unsupported/);
    expect(() => parsePath('M0,0 L1,1 Z')).toThrow(/Unsupported/);
    expect(() => parsePath('M0,0')).toThrow(/two points/);
    expect(() => parsePath('L0,0 L1,1')).toThrow(/start with M/);
  });
});

describe('polyline math', () => {
  const L = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
  ];

  it('measures length', () => {
    expect(polylineLength(L)).toBe(70);
  });

  it('finds points along the line and clamps outside the range', () => {
    expect(pointAt(L, 15)).toEqual({ x: 15, y: 0 });
    expect(pointAt(L, 50)).toEqual({ x: 30, y: 20 });
    expect(pointAt(L, -5)).toEqual({ x: 0, y: 0 });
    expect(pointAt(L, 999)).toEqual({ x: 30, y: 40 });
  });
});

describe('routes', () => {
  const edges = new Map<string, Edge>([
    ['a', { id: 'a', d: 'M0,0 L10,0' }],
    ['b', { id: 'b', d: 'M10,0 L10,20' }],
  ]);

  it('parses reverse references', () => {
    expect(parseRef('-E8')).toEqual({ id: 'E8', reverse: true });
    expect(parseRef('bus_det')).toEqual({ id: 'bus_det', reverse: false });
  });

  it('joins edges into one route and walks it by ratio', () => {
    const r = buildRoute(['a', 'b'], edges);
    expect(r.total).toBe(30);
    expect(pointOnRoute(r, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnRoute(r, 0.5)).toEqual({ x: 10, y: 5 });
    expect(pointOnRoute(r, 1)).toEqual({ x: 10, y: 20 });
  });

  it('walks reversed edges from their end', () => {
    const r = buildRoute(['-b', '-a'], edges);
    expect(pointOnRoute(r, 0)).toEqual({ x: 10, y: 20 });
    expect(pointOnRoute(r, 1)).toEqual({ x: 0, y: 0 });
  });

  it('rejects unknown edges and empty routes', () => {
    expect(() => buildRoute(['nope'], edges)).toThrow(/Unknown edge "nope"/);
    expect(() => buildRoute([], edges)).toThrow(/empty/);
  });

  it('uses 4.2 ms per unit with a 1.2 s floor', () => {
    expect(routeDuration(buildRoute(['a'], edges))).toBe(1200);
    expect(routeDuration({ segments: [], total: 1000 })).toBe(4200);
  });
});
