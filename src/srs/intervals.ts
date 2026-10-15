import { addDays, addHours, addMinutes, addMonths, addWeeks } from 'date-fns';
import type { Interval, Unit } from '@/domain/types';

/**
 * Minutos por unidad. `mo` vale 30 días: sirve para **comparar** intervalos,
 * no para sumarlos. Sumar usa siempre aritmética de calendario (`addInterval`),
 * que respeta los meses de distinta longitud y los cambios de horario.
 */
const MINUTES: Record<Unit, number> = {
  min: 1,
  h: 60,
  d: 1440,
  w: 10080,
  mo: 43200,
};

const DAY = MINUTES.d;

/** A partir de aquí un intervalo se cuenta en días, no en horas. */
const HOURS_LIMIT = 48 * MINUTES.h;

export function toMinutes(interval: Interval): number {
  return interval.value * MINUTES[interval.unit];
}

/** Suma un intervalo con aritmética de calendario (DST y meses incluidos). */
export function addInterval(from: Date, interval: Interval): Date {
  // date-fns trunca las cantidades fraccionarias, así que «3,5 d» se suma en
  // minutos. Las unidades enteras sí pasan por la aritmética de calendario.
  if (!Number.isInteger(interval.value)) {
    return addMinutes(from, Math.round(toMinutes(interval)));
  }
  switch (interval.unit) {
    case 'min':
      return addMinutes(from, interval.value);
    case 'h':
      return addHours(from, interval.value);
    case 'd':
      return addDays(from, interval.value);
    case 'w':
      return addWeeks(from, interval.value);
    case 'mo':
      return addMonths(from, interval.value);
  }
}

/** Un intervalo de ≥ 1 día se ancla a la hora de inicio del día (contrato §4). */
export function spansADay(interval: Interval): boolean {
  return toMinutes(interval) >= DAY;
}

/**
 * Expresa unos minutos en la unidad que mejor se lee: minutos por debajo de
 * una hora, horas hasta dos días y días a partir de ahí, con un decimal como
 * máximo. 720 → `12 h`, 2160 → `36 h`, 5040 → `3,5 d`, 262800 → `182,5 d`.
 *
 * No devuelve semanas ni meses a propósito: «15 d» se lee mejor que «2,1 sem».
 * Esas unidades siguen disponibles para los intervalos que define el usuario.
 */
export function fromMinutes(minutes: number): Interval {
  const total = Math.max(1, Math.round(minutes));
  if (total < MINUTES.h) return { value: total, unit: 'min' };
  const unit: Unit = total < HOURS_LIMIT ? 'h' : 'd';
  return { value: Math.round((total / MINUTES[unit]) * 10) / 10, unit };
}

/** Multiplica un intervalo (p. ej. «Difícil» × 0,5) y lo renormaliza. */
export function scaleInterval(interval: Interval, factor: number): Interval {
  return fromMinutes(toMinutes(interval) * factor);
}

/** El mayor de dos intervalos. Se usa para aplicar `minInterval`. */
export function maxInterval(a: Interval, b: Interval): Interval {
  return toMinutes(a) >= toMinutes(b) ? a : b;
}

export function sameInterval(a: Interval, b: Interval): boolean {
  return toMinutes(a) === toMinutes(b);
}

/**
 * Lleva una fecha a la hora de inicio del día **local**, el mismo día.
 * `dayStartHour` 8 → jueves 16 a las 8:00 de la mañana, hora local.
 */
export function atDayStart(date: Date, dayStartHour: number): Date {
  const out = new Date(date);
  out.setHours(dayStartHour, 0, 0, 0);
  return out;
}

/**
 * Calcula la fecha del próximo repaso: suma el intervalo y, si es de un día o
 * más, lo ancla a la hora preferida del día resultante.
 */
export function nextDue(from: Date, interval: Interval, dayStartHour: number): Date {
  const landed = addInterval(from, interval);
  return spansADay(interval) ? atDayStart(landed, dayStartHour) : landed;
}

/** Decimales con coma, como se escriben en español. */
const num = (value: number): string => String(value).replace('.', ',');

/** Etiqueta en español para los botones de la sesión: «10 min», «1 d», «2 sem». */
export function formatInterval(interval: Interval): string {
  const { value, unit } = interval;
  switch (unit) {
    case 'min':
      return `${num(value)} min`;
    case 'h':
      return `${num(value)} h`;
    case 'd':
      return `${num(value)} d`;
    case 'w':
      return `${num(value)} sem`;
    case 'mo':
      return value === 1 ? '1 mes' : `${num(value)} meses`;
  }
}
