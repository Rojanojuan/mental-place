import type { ID, ReviewState, Schedule } from '@/domain/types';
import { itemStatus } from './status';

export type QueueScope = 'today' | 'locus' | 'zone' | 'palace' | 'walk';

/**
 * Un candidato a entrar en la cola. El llamador ya filtró por alcance (los
 * ítems de este punto, de esta zona, de este palacio…); aquí solo se decide
 * qué entra y en qué orden.
 */
export interface QueueCandidate {
  itemId: ID;
  locusId: ID | null;
  /** Número de ruta del punto. Ordena el modo `walk`. */
  routeNo?: number;
  /** Menor es más importante (p. ej. nº de frecuencia). */
  priority?: number;
  state: ReviewState;
}

export interface QueueRequest {
  scope: QueueScope;
  candidates: QueueCandidate[];
  /** Necesario para distinguir los ítems dominados. */
  schedule?: Schedule;
  /** Límite diario de ítems nuevos. Sin él, no se limitan. */
  newLimit?: number;
  /** Tope total de la cola. */
  limit?: number;
  /** Incluir los dominados cuyo repaso opcional ya venció. */
  includeMastered?: boolean;
}

/** Sin prioridad declarada, al final. */
const rank = (candidate: QueueCandidate): number => candidate.priority ?? Number.POSITIVE_INFINITY;

/** Desempate estable y reproducible: prioridad y, a igualdad, el id. */
function byPriority(a: QueueCandidate, b: QueueCandidate): number {
  return rank(a) - rank(b) || a.itemId.localeCompare(b.itemId);
}

function byDueAt(a: QueueCandidate, b: QueueCandidate): number {
  const at = (c: QueueCandidate): number =>
    c.state.dueAt === null ? Number.POSITIVE_INFINITY : Date.parse(c.state.dueAt);
  return at(a) - at(b) || byPriority(a, b);
}

function byRouteNo(a: QueueCandidate, b: QueueCandidate): number {
  const no = (c: QueueCandidate): number => c.routeNo ?? Number.POSITIVE_INFINITY;
  return no(a) - no(b) || byPriority(a, b);
}

/**
 * Arma la cola de repaso: primero lo vencido por fecha, después los nuevos
 * hasta el límite diario, desempatando por prioridad.
 *
 * En `walk` manda el recorrido: todos los puntos en orden de ruta, sin filtrar
 * por vencimiento, que es el palacio de la memoria clásico.
 */
export function buildQueue(request: QueueRequest, now: Date): QueueCandidate[] {
  const { candidates, schedule, scope, newLimit, limit, includeMastered } = request;
  const active = candidates.filter((c) => !c.state.suspended);

  if (scope === 'walk') {
    const walk = [...active].sort(byRouteNo);
    return limit === undefined ? walk : walk.slice(0, limit);
  }

  const due: QueueCandidate[] = [];
  const fresh: QueueCandidate[] = [];
  const mastered: QueueCandidate[] = [];

  for (const candidate of active) {
    const status = itemStatus(candidate.state, now, schedule);
    if (status === 'due') due.push(candidate);
    else if (status === 'new') fresh.push(candidate);
    else if (
      status === 'mastered' &&
      includeMastered === true &&
      candidate.state.dueAt !== null &&
      Date.parse(candidate.state.dueAt) <= now.getTime()
    ) {
      mastered.push(candidate);
    }
  }

  due.sort(byDueAt);
  fresh.sort(byPriority);
  mastered.sort(byDueAt);

  const queue = [
    ...due,
    ...(newLimit === undefined ? fresh : fresh.slice(0, Math.max(0, newLimit))),
    ...mastered,
  ];
  return limit === undefined ? queue : queue.slice(0, limit);
}

/** Cuántos repasos vencidos y cuántos nuevos hay, para la pantalla de Hoy. */
export function queueCounts(
  candidates: QueueCandidate[],
  now: Date,
  schedule?: Schedule,
): { due: number; new: number; mastered: number; suspended: number } {
  const counts = { due: 0, new: 0, mastered: 0, suspended: 0 };
  for (const candidate of candidates) {
    const status = itemStatus(candidate.state, now, schedule);
    if (status === 'due') counts.due += 1;
    else if (status === 'new') counts.new += 1;
    else if (status === 'mastered') counts.mastered += 1;
    else if (status === 'suspended') counts.suspended += 1;
  }
  return counts;
}
