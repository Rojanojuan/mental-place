import type { Grade, ID, Interval, ReviewLog, ReviewState, Schedule } from '@/domain/types';
import {
  addInterval,
  atDayStart,
  formatInterval,
  fromMinutes,
  maxInterval,
  nextDue,
  scaleInterval,
  spansADay,
  toMinutes,
} from './intervals';
import { ADAPTIVE_MIN_EASE, ADAPTIVE_INITIAL_EASE } from './presets';

export interface GradeOptions {
  /**
   * Id del log. Si no se pasa se deriva del ítem y la fecha: así la función
   * sigue siendo pura (sin aleatoriedad ni reloj propio).
   */
  logId?: ID;
  durationSec?: number;
}

export interface Outcome {
  stage: number;
  /** Intervalo aplicado. `null` solo en un ajuste manual a fecha exacta. */
  interval: Interval | null;
  dueAt: Date;
  mastered: boolean;
  lapses: number;
  streak: number;
  ease: number | undefined;
}

export interface GradeResult {
  state: ReviewState;
  proposedDueAt: Date;
  log: ReviewLog;
  interval: Interval | null;
  mastered: boolean;
}

/** Etapa efectiva: un ítem nuevo (0) se trata como la 1 para «misma etapa». */
const effectiveStage = (stage: number): number => Math.max(1, stage);

/** El intervalo de una etapa; por encima del último checkpoint, el último. */
function intervalAt(intervals: Interval[], stage: number): Interval {
  const index = Math.min(Math.max(stage, 1), intervals.length) - 1;
  const interval = intervals[index];
  if (!interval) throw new Error('El horario no tiene ningún intervalo definido');
  return interval;
}

function stageAfterAgain(current: number, action: Schedule['rules']['againAction']): number {
  switch (action) {
    case 'reset':
      return 1;
    case 'back1':
      return Math.max(1, current - 1);
    case 'back2':
      return Math.max(1, current - 2);
  }
}

/** Aplica el mínimo del horario y, si es de un día o más, la hora preferida. */
function settle(
  now: Date,
  interval: Interval,
  schedule: Schedule,
): { interval: Interval; dueAt: Date } {
  const floored = maxInterval(interval, schedule.rules.minInterval);
  return { interval: floored, dueAt: nextDue(now, floored, schedule.rules.dayStartHour) };
}

function checkpointOutcome(
  state: ReviewState,
  schedule: Schedule,
  grade: Grade,
  now: Date,
): Outcome {
  const { intervals, rules } = schedule;
  const count = intervals.length;
  const current = effectiveStage(state.stage);
  let stage: number;

  switch (grade) {
    case 'again':
      stage = stageAfterAgain(current, rules.againAction);
      break;
    case 'hard':
      stage = current;
      break;
    case 'good':
      stage = state.stage + 1;
      break;
    case 'easy':
      stage = state.stage + rules.easySkip;
      break;
  }

  // Una sola etapa canónica para «dominado»: la que va justo detrás del último
  // checkpoint. Así un ítem dominado no sigue subiendo sin límite.
  stage = Math.min(stage, count + 1);
  const mastered = stage > count;

  const base = intervalAt(intervals, grade === 'hard' ? current : stage);
  const raw = grade === 'hard' ? scaleInterval(base, rules.hardFactor) : base;
  const { interval, dueAt } = settle(now, raw, schedule);

  return {
    stage,
    interval,
    dueAt,
    mastered,
    lapses: grade === 'again' ? state.lapses + 1 : state.lapses,
    streak: grade === 'again' ? 0 : state.streak + 1,
    ease: state.ease,
  };
}

/**
 * Intervalo que se aplicó la última vez, deducido de `dueAt - lastReviewedAt`.
 * Evita añadir un campo al contrato y, si el usuario fijó la fecha a mano, el
 * modo adaptativo parte de la que él eligió.
 */
function previousInterval(state: ReviewState, schedule: Schedule): Interval {
  if (state.lastReviewedAt === undefined || state.dueAt === null) {
    return intervalAt(schedule.intervals, 1);
  }
  const minutes = (Date.parse(state.dueAt) - Date.parse(state.lastReviewedAt)) / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return intervalAt(schedule.intervals, 1);
  return fromMinutes(minutes);
}

function adaptiveOutcome(state: ReviewState, schedule: Schedule, grade: Grade, now: Date): Outcome {
  const prev = previousInterval(state, schedule);
  const current = state.ease ?? ADAPTIVE_INITIAL_EASE;
  const clamp = (ease: number): number => Math.max(ADAPTIVE_MIN_EASE, Number(ease.toFixed(3)));

  let ease = current;
  let stage: number;
  let raw: Interval;

  switch (grade) {
    case 'again':
      ease = clamp(current - 0.2);
      stage = 1;
      raw = schedule.rules.minInterval;
      break;
    case 'hard':
      ease = clamp(current - 0.15);
      stage = effectiveStage(state.stage);
      raw = scaleInterval(prev, 1.2);
      break;
    case 'good':
      stage = state.stage + 1;
      raw = scaleInterval(prev, ease);
      break;
    case 'easy':
      ease = clamp(current + 0.15);
      stage = state.stage + 1;
      raw = scaleInterval(prev, ease * 1.3);
      break;
  }

  const { interval, dueAt } = settle(now, raw, schedule);
  return {
    stage,
    interval,
    dueAt,
    // El modo adaptativo no tiene última etapa: nunca marca «dominado».
    mastered: false,
    lapses: grade === 'again' ? state.lapses + 1 : state.lapses,
    streak: grade === 'again' ? 0 : state.streak + 1,
    ease,
  };
}

export function computeNext(
  state: ReviewState,
  schedule: Schedule,
  grade: Grade,
  now: Date,
): Outcome {
  return schedule.mode === 'adaptive'
    ? adaptiveOutcome(state, schedule, grade, now)
    : checkpointOutcome(state, schedule, grade, now);
}

function applyOutcome(state: ReviewState, outcome: Outcome, now: Date): ReviewState {
  const next: ReviewState = {
    ...state,
    stage: outcome.stage,
    dueAt: outcome.dueAt.toISOString(),
    lastReviewedAt: now.toISOString(),
    lapses: outcome.lapses,
    streak: outcome.streak,
  };
  if (outcome.ease !== undefined) next.ease = outcome.ease;
  return next;
}

function buildLog(
  state: ReviewState,
  outcome: Outcome,
  grade: Grade,
  now: Date,
  manual: boolean,
  stageBefore: number,
  options: GradeOptions = {},
): ReviewLog {
  const at = now.toISOString();
  const log: ReviewLog = {
    id: options.logId ?? `log-${state.itemId}-${at}`,
    itemId: state.itemId,
    at,
    grade,
    stageBefore,
    stageAfter: outcome.stage,
    intervalApplied: outcome.interval,
    dueAt: outcome.dueAt.toISOString(),
    manual,
  };
  if (options.durationSec !== undefined) log.durationSec = options.durationSec;
  return log;
}

/**
 * Califica un ítem y devuelve el estado nuevo, la fecha propuesta y el log.
 * La fecha es una **propuesta**: el usuario siempre puede ajustarla con
 * `override()` antes de guardar (contrato §4.3).
 */
export function grade(
  state: ReviewState,
  schedule: Schedule,
  value: Grade,
  now: Date,
  options: GradeOptions = {},
): GradeResult {
  const outcome = computeNext(state, schedule, value, now);
  return {
    state: applyOutcome(state, outcome, now),
    proposedDueAt: outcome.dueAt,
    log: buildLog(state, outcome, value, now, false, state.stage, options),
    interval: outcome.interval,
    mastered: outcome.mastered,
  };
}

export type OverrideTarget = { at: Date } | { addInterval: Interval } | { stage: number };

export interface OverrideOptions extends GradeOptions {
  /** La calificación que el usuario dio antes de ajustar la fecha; va al log. */
  grade?: Grade;
  /** Etapa previa a la calificación, para que el log cuente la historia entera. */
  stageBefore?: number;
}

/**
 * Fija el próximo repaso a mano. Marca `manual = true` en el log.
 * Con `{ stage }` el horario continúa desde ese checkpoint.
 *
 * Se llama con el estado **ya calificado** por `grade()`; pasa `stageBefore`
 * para que el log conserve la etapa de partida, y usa este log en lugar del de
 * `grade()`, no los dos.
 */
export function override(
  state: ReviewState,
  schedule: Schedule,
  target: OverrideTarget,
  now: Date,
  options: OverrideOptions = {},
): GradeResult {
  const count = schedule.intervals.length;
  let stage = state.stage;
  let interval: Interval | null = null;
  let dueAt: Date;

  if ('at' in target) {
    dueAt = new Date(target.at);
  } else if ('addInterval' in target) {
    interval = target.addInterval;
    dueAt = spansADay(interval)
      ? atDayStart(addInterval(now, interval), schedule.rules.dayStartHour)
      : addInterval(now, interval);
  } else {
    stage = Math.min(Math.max(1, Math.trunc(target.stage)), count + 1);
    interval = intervalAt(schedule.intervals, stage);
    dueAt = nextDue(now, interval, schedule.rules.dayStartHour);
  }

  const outcome: Outcome = {
    stage,
    interval,
    dueAt,
    mastered: schedule.mode === 'checkpoints' && stage > count,
    lapses: state.lapses,
    streak: state.streak,
    ease: state.ease,
  };

  return {
    state: applyOutcome(state, outcome, now),
    proposedDueAt: dueAt,
    log: buildLog(
      state,
      outcome,
      options.grade ?? 'good',
      now,
      true,
      options.stageBefore ?? state.stage,
      options,
    ),
    interval,
    mastered: outcome.mastered,
  };
}

export interface GradePreview {
  grade: Grade;
  /** Texto del botón: «10 min», «1 d»… */
  label: string;
  interval: Interval | null;
  at: Date;
  stage: number;
  mastered: boolean;
}

const ALL_GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

/**
 * Lo que pasaría con cada calificación, para pintar los 4 botones con su
 * intervalo debajo sin tocar el estado.
 */
export function previewIntervals(
  state: ReviewState,
  schedule: Schedule,
  now: Date,
): Record<Grade, GradePreview> {
  const entries = ALL_GRADES.map((value) => {
    const outcome = computeNext(state, schedule, value, now);
    const preview: GradePreview = {
      grade: value,
      label: outcome.interval ? formatInterval(outcome.interval) : '—',
      interval: outcome.interval,
      at: outcome.dueAt,
      stage: outcome.stage,
      mastered: outcome.mastered,
    };
    return [value, preview] as const;
  });
  return Object.fromEntries(entries) as Record<Grade, GradePreview>;
}

/** Atajos de la hoja de próximo repaso (contrato §4.3). */
export interface Shortcut {
  id: string;
  label: string;
  at: Date;
}

export function shortcuts(now: Date, dayStartHour: number, nightHour = 21): Shortcut[] {
  const tomorrow = atDayStart(addInterval(now, { value: 1, unit: 'd' }), dayStartHour);
  const tonight = new Date(now);
  tonight.setHours(nightHour, 0, 0, 0);
  return [
    { id: '+10min', label: '+10 min', at: addInterval(now, { value: 10, unit: 'min' }) },
    // Si ya pasó la hora de la noche, «esta noche» cae mañana a esa hora.
    {
      id: 'tonight',
      label: 'Esta noche',
      at:
        tonight > now
          ? tonight
          : atDayStart(addInterval(tonight, { value: 1, unit: 'd' }), nightHour),
    },
    { id: 'tomorrow', label: 'Mañana', at: tomorrow },
    {
      id: '+3d',
      label: '+3 d',
      at: atDayStart(addInterval(now, { value: 3, unit: 'd' }), dayStartHour),
    },
    {
      id: '+1w',
      label: '+1 sem',
      at: atDayStart(addInterval(now, { value: 1, unit: 'w' }), dayStartHour),
    },
    {
      id: '+1mo',
      label: '+1 mes',
      at: atDayStart(addInterval(now, { value: 1, unit: 'mo' }), dayStartHour),
    },
  ];
}

export { toMinutes };
