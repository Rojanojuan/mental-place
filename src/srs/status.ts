import type { LocusState, ReviewState, Schedule } from '@/domain/types';

/**
 * Estado de un ítem (contrato §3).
 *
 * `schedule` es opcional porque sin él no se puede saber cuál es la última
 * etapa: pásalo si quieres distinguir `mastered` de `review`.
 *
 * `mastered` se comprueba **antes** que `due`: su repaso anual es opcional
 * (contrato §4.1), así que un ítem dominado no debe pintarse en rojo urgente.
 */
export function itemStatus(state: ReviewState, now: Date, schedule?: Schedule): LocusState {
  if (state.suspended) return 'suspended';
  if (state.stage <= 0) return 'new';
  if (schedule && state.stage > schedule.intervals.length) return 'mastered';
  if (state.dueAt !== null && Date.parse(state.dueAt) <= now.getTime()) return 'due';
  return state.stage <= 3 ? 'learning' : 'review';
}

/** De más urgente a menos (contrato §3). `suspended` no está en la lista del contrato: va al final. */
const URGENCY: LocusState[] = [
  'due',
  'learning',
  'new',
  'review',
  'mastered',
  'suspended',
  'empty',
];

/** Estado de un punto: el más urgente de sus ítems. Sin ítems, `empty`. */
export function locusStatus(states: LocusState[]): LocusState {
  for (const candidate of URGENCY) {
    if (states.includes(candidate)) return candidate;
  }
  return 'empty';
}

/** Compara dos estados por urgencia. Negativo si `a` es más urgente. */
export function compareUrgency(a: LocusState, b: LocusState): number {
  return URGENCY.indexOf(a) - URGENCY.indexOf(b);
}
