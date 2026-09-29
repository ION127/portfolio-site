import { describe, expect, it } from 'vitest';
import { activationLine, activeStepIndex } from '../../src/lib/diagram/steps';

describe('activeStepIndex', () => {
  const tops = [100, 600, 1100];

  it('picks the last paragraph above the reading line', () => {
    expect(activeStepIndex(tops, 495)).toBe(0);
    expect(activeStepIndex(tops, 700)).toBe(1);
    expect(activeStepIndex(tops, 5000)).toBe(2);
  });

  it('falls back to the first step before any paragraph reaches the line', () => {
    expect(activeStepIndex([800, 1300], 495)).toBe(0);
    expect(activeStepIndex([], 495)).toBe(0);
  });

  it('does not activate a paragraph sitting exactly on the line', () => {
    expect(activeStepIndex([100, 495], 495)).toBe(0);
  });
});

describe('activationLine', () => {
  it('uses 55% of the viewport side by side', () => {
    expect(activationLine(900, false)).toBeCloseTo(495);
  });

  it('uses 35% of the space under the pinned diagram when stacked', () => {
    expect(activationLine(900, true, 400)).toBeCloseTo(575);
  });
});
