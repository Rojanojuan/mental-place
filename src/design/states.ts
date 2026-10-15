import type { LocusState } from '@/domain/types';

/** Token CSS de color por estado (contrato §3). */
export const STATE_TOKEN: Record<LocusState, string> = {
  empty: '--state-empty',
  new: '--state-new',
  learning: '--state-learning',
  due: '--state-due',
  review: '--state-review',
  mastered: '--state-mastered',
  suspended: '--state-suspended',
};

/** Etiqueta en español para la UI. */
export const STATE_LABEL: Record<LocusState, string> = {
  empty: 'Sin ítems',
  new: 'Nuevo',
  learning: 'Aprendiendo',
  due: 'Vencido',
  review: 'Al día',
  mastered: 'Dominado',
  suspended: 'Pausado',
};
