import type { Interval, Schedule } from '@/domain/types';

/** Hora preferida por defecto para los repasos de un día o más. */
export const DEFAULT_DAY_START_HOUR = 8;

const d = (value: number): Interval => ({ value, unit: 'd' });
const min = (value: number): Interval => ({ value, unit: 'min' });
const h = (value: number): Interval => ({ value, unit: 'h' });

const DEFAULT_RULES: Schedule['rules'] = {
  againAction: 'reset',
  hardFactor: 0.5,
  easySkip: 2,
  minInterval: min(10),
  dayStartHour: DEFAULT_DAY_START_HOUR,
};

/** R10, el preset por defecto: 10 checkpoints de 10 minutos a un año. */
export const R10: Schedule = {
  id: 'sch-r10',
  name: 'R10',
  mode: 'checkpoints',
  intervals: [min(10), d(1), d(3), d(7), d(14), d(30), d(60), d(90), d(180), d(365)],
  rules: { ...DEFAULT_RULES },
};

export const QUICK_EXAM: Schedule = {
  id: 'sch-examen',
  name: 'Rápido examen',
  mode: 'checkpoints',
  intervals: [h(1), d(1), d(2), d(4), d(7), d(14)],
  rules: { ...DEFAULT_RULES, minInterval: min(10) },
};

export const CLASSIC: Schedule = {
  id: 'sch-clasico',
  name: 'Clásico 1-3-7-14-30',
  mode: 'checkpoints',
  intervals: [d(1), d(3), d(7), d(14), d(30)],
  rules: { ...DEFAULT_RULES },
};

/** Ease inicial 2,5 y mínimo 1,3 (contrato §4.1). */
export const ADAPTIVE_INITIAL_EASE = 2.5;
export const ADAPTIVE_MIN_EASE = 1.3;

export const ADAPTIVE: Schedule = {
  id: 'sch-adaptativo',
  name: 'Adaptativo (tipo SM-2)',
  mode: 'adaptive',
  intervals: [min(10), d(1)],
  rules: { ...DEFAULT_RULES },
};

/** Punto de partida para «Personalizado»: el usuario define sus N intervalos. */
export const CUSTOM_TEMPLATE: Schedule = {
  id: 'sch-personalizado',
  name: 'Personalizado',
  mode: 'checkpoints',
  intervals: [min(10), d(1), d(7)],
  rules: { ...DEFAULT_RULES },
};

export const PRESETS: Schedule[] = [R10, QUICK_EXAM, CLASSIC, ADAPTIVE, CUSTOM_TEMPLATE];

export function findPreset(id: string): Schedule | undefined {
  return PRESETS.find((p) => p.id === id);
}
