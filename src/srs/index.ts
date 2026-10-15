/**
 * Motor de repaso. **Puro**: sin I/O, sin reloj propio (la fecha entra por
 * parámetro) y sin aleatoriedad. ESLint impide que este directorio importe
 * persistencia o UI (ver docs/DECISIONES.md D-007).
 */
import type { ReviewState } from '@/domain/types';

export {
  addInterval,
  atDayStart,
  formatInterval,
  fromMinutes,
  maxInterval,
  nextDue,
  sameInterval,
  scaleInterval,
  spansADay,
  toMinutes,
} from './intervals';

export {
  ADAPTIVE,
  ADAPTIVE_INITIAL_EASE,
  ADAPTIVE_MIN_EASE,
  CLASSIC,
  CUSTOM_TEMPLATE,
  DEFAULT_DAY_START_HOUR,
  PRESETS,
  QUICK_EXAM,
  R10,
  findPreset,
} from './presets';

export { computeNext, grade, override, previewIntervals, shortcuts } from './grade';
export type {
  GradeOptions,
  GradePreview,
  GradeResult,
  Outcome,
  OverrideOptions,
  OverrideTarget,
  Shortcut,
} from './grade';

export { compareUrgency, itemStatus, locusStatus } from './status';

export { buildQueue, queueCounts } from './queue';
export type { QueueCandidate, QueueRequest, QueueScope } from './queue';

/** Estado inicial de un ítem que nunca se ha estudiado. */
export function newReviewState(itemId: string, scheduleId: string): ReviewState {
  return {
    itemId,
    scheduleId,
    stage: 0,
    dueAt: null,
    lapses: 0,
    streak: 0,
    suspended: false,
  };
}
