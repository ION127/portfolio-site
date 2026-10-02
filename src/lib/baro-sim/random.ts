// 시드를 받는 난수(mulberry32). 같은 시드면 같은 수열이 나와 테스트에서 장면을 고정할 수 있다.
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

/** min 이상 max 이하의 정수. */
export const intBetween = (rng: Rng, min: number, max: number): number => Math.floor(between(rng, min, max + 1));

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;

/** 가중치에 비례해 하나를 고른다. 가중치는 0보다 커야 한다. */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
