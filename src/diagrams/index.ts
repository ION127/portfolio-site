import type { DiagramSpec } from '../lib/diagram/types';
import type { DiagramId } from './ids';
import { baro } from './baro';

export type { DiagramId } from './ids';

// Task 10에서 stockpulse를 추가한다. 없는 다이어그램은 페이지가 "준비 중"으로 보여준다.
export const DIAGRAMS: Partial<Record<DiagramId, DiagramSpec>> = { baro };
