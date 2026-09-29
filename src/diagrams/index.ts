import type { DiagramSpec } from '../lib/diagram/types';
import type { DiagramId } from './ids';
import { baro } from './baro';
import { stockpulse } from './stockpulse';

export type { DiagramId } from './ids';

export const DIAGRAMS: Partial<Record<DiagramId, DiagramSpec>> = { baro, stockpulse };
