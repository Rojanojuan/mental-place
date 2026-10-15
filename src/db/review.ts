import type { Grade, ID, Item, LocusState, ReviewLog, ReviewState, Schedule } from '@/domain/types';
import {
  R10,
  type GradeOptions,
  type GradeResult,
  type OverrideOptions,
  type OverrideTarget,
  type QueueCandidate,
  type QueueScope,
  buildQueue,
  grade as gradePure,
  itemStatus,
  locusStatus,
  newReviewState,
  override as overridePure,
  previewIntervals,
  queueCounts,
} from '@/srs';
import { type PalacioDB, db } from './db';
import { listLoci } from './repo';

type DB = PalacioDB;

// --------------------------------------------------------- estado por ítem

export function getReviewState(itemId: ID, database: DB = db): Promise<ReviewState | undefined> {
  return database.reviewStates.get(itemId);
}

/**
 * El horario de un ítem: el de su mazo si lo declara, y R10 si no.
 * R10 se garantiza en la base de datos al sembrar (ver `seed.ts`).
 */
export async function resolveSchedule(item: Item, database: DB = db): Promise<Schedule> {
  if (item.deckId !== undefined) {
    const deck = await database.decks.get(item.deckId);
    if (deck?.scheduleId !== undefined) {
      const schedule = await database.schedules.get(deck.scheduleId);
      if (schedule) return schedule;
    }
  }
  return (await database.schedules.get(R10.id)) ?? R10;
}

/** Devuelve el estado de repaso del ítem, creándolo si todavía no existe. */
export async function ensureReviewState(itemId: ID, database: DB = db): Promise<ReviewState> {
  const existing = await database.reviewStates.get(itemId);
  if (existing) return existing;

  const item = await database.items.get(itemId);
  if (!item) throw new Error(`No existe el ítem ${itemId}`);
  const schedule = await resolveSchedule(item, database);
  const state = newReviewState(itemId, schedule.id);
  await database.reviewStates.put(state);
  return state;
}

export async function setSuspended(
  itemId: ID,
  suspended: boolean,
  database: DB = db,
): Promise<void> {
  await ensureReviewState(itemId, database);
  await database.reviewStates.update(itemId, { suspended });
}

// ------------------------------------------------------------ calificar

async function persist(result: GradeResult, database: DB): Promise<GradeResult> {
  await database.transaction('rw', [database.reviewStates, database.reviewLogs], async () => {
    await database.reviewStates.put(result.state);
    await database.reviewLogs.put(result.log);
  });
  return result;
}

/**
 * Califica un ítem: calcula con el motor puro y guarda estado y log en una
 * sola transacción.
 *
 * Si el usuario va a ajustar la fecha, no llames a esto y luego a
 * `applyOverride`: eso dejaría dos logs. Usa `proposeGrade()` para ver la
 * propuesta y después `applyOverride()` para guardar una sola vez.
 */
export async function applyGrade(
  itemId: ID,
  value: Grade,
  now: Date,
  options: GradeOptions = {},
  database: DB = db,
): Promise<GradeResult> {
  const state = await ensureReviewState(itemId, database);
  const item = await database.items.get(itemId);
  if (!item) throw new Error(`No existe el ítem ${itemId}`);
  const schedule = await resolveSchedule(item, database);
  return persist(gradePure(state, schedule, value, now, options), database);
}

/** La propuesta de calificar, **sin guardar nada**. */
export async function proposeGrade(
  itemId: ID,
  value: Grade,
  now: Date,
  database: DB = db,
): Promise<GradeResult> {
  const state = await ensureReviewState(itemId, database);
  const item = await database.items.get(itemId);
  if (!item) throw new Error(`No existe el ítem ${itemId}`);
  const schedule = await resolveSchedule(item, database);
  return gradePure(state, schedule, value, now, {});
}

/** Los cuatro botones con su intervalo, para la sesión. */
export async function previewForItem(itemId: ID, now: Date, database: DB = db) {
  const state = await ensureReviewState(itemId, database);
  const item = await database.items.get(itemId);
  if (!item) throw new Error(`No existe el ítem ${itemId}`);
  const schedule = await resolveSchedule(item, database);
  return previewIntervals(state, schedule, now);
}

/**
 * Guarda una calificación con la fecha que el usuario fijó a mano.
 * `options.grade` es la calificación que dio antes de ajustar.
 */
export async function applyOverride(
  itemId: ID,
  target: OverrideTarget,
  now: Date,
  options: OverrideOptions = {},
  database: DB = db,
): Promise<GradeResult> {
  const stored = await ensureReviewState(itemId, database);
  const item = await database.items.get(itemId);
  if (!item) throw new Error(`No existe el ítem ${itemId}`);
  const schedule = await resolveSchedule(item, database);

  // Si el usuario calificó antes de ajustar, el estado de partida es el que
  // dejó esa calificación, y el log conserva la etapa original.
  const graded = options.grade
    ? gradePure(stored, schedule, options.grade, now, {})
    : { state: stored };
  const result = overridePure(graded.state, schedule, target, now, {
    ...options,
    stageBefore: options.stageBefore ?? stored.stage,
  });
  return persist(result, database);
}

export function listLogs(itemId: ID, database: DB = db): Promise<ReviewLog[]> {
  return database.reviewLogs
    .where('itemId')
    .equals(itemId)
    .toArray()
    .then((logs) => logs.sort((a, b) => a.at.localeCompare(b.at)));
}

// -------------------------------------------------------------- estados

/** Estado de cada punto de un palacio, para pintar el mapa. */
export async function statusByLocus(
  palaceId: ID,
  now: Date,
  database: DB = db,
): Promise<Record<ID, LocusState>> {
  const loci = await listLoci(palaceId, database);
  const locusIds = loci.map((locus) => locus.id);
  const items = await database.items.where('locusId').anyOf(locusIds).toArray();
  const states = await database.reviewStates.bulkGet(items.map((item) => item.id));
  const schedules = await database.schedules.toArray();
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));

  const byLocus = new Map<ID, LocusState[]>();
  for (const [index, item] of items.entries()) {
    if (item.locusId === null) continue;
    const state = states[index];
    const status: LocusState = state
      ? itemStatus(state, now, scheduleById.get(state.scheduleId))
      : 'new';
    const bucket = byLocus.get(item.locusId);
    if (bucket) bucket.push(status);
    else byLocus.set(item.locusId, [status]);
  }

  const out: Record<ID, LocusState> = {};
  for (const locus of loci) out[locus.id] = locusStatus(byLocus.get(locus.id) ?? []);
  return out;
}

// ----------------------------------------------------------------- colas

export interface ScopeRequest {
  scope: QueueScope;
  palaceId?: ID;
  zoneId?: ID;
  locusId?: ID;
  newLimit?: number;
  limit?: number;
  includeMastered?: boolean;
}

/** Reúne los candidatos del alcance pedido, ya con su estado de repaso. */
export async function collectCandidates(
  request: ScopeRequest,
  database: DB = db,
): Promise<QueueCandidate[]> {
  let items: Item[];
  let routeByLocus = new Map<ID, number>();

  if (request.locusId !== undefined) {
    items = await database.items.where('locusId').equals(request.locusId).toArray();
  } else if (request.zoneId !== undefined) {
    const loci = await database.loci.where('zoneId').equals(request.zoneId).toArray();
    routeByLocus = new Map(loci.map((locus) => [locus.id, locus.routeNo]));
    items = await database.items
      .where('locusId')
      .anyOf(loci.map((locus) => locus.id))
      .toArray();
  } else if (request.palaceId !== undefined) {
    const loci = await listLoci(request.palaceId, database);
    routeByLocus = new Map(loci.map((locus) => [locus.id, locus.routeNo]));
    items = await database.items
      .where('locusId')
      .anyOf(loci.map((locus) => locus.id))
      .toArray();
  } else {
    items = await database.items.toArray();
    const loci = await database.loci.toArray();
    routeByLocus = new Map(loci.map((locus) => [locus.id, locus.routeNo]));
  }

  const candidates: QueueCandidate[] = [];
  for (const item of items) {
    const state = (await database.reviewStates.get(item.id)) ?? {
      ...newReviewState(item.id, R10.id),
    };
    const candidate: QueueCandidate = { itemId: item.id, locusId: item.locusId, state };
    const routeNo = item.locusId === null ? undefined : routeByLocus.get(item.locusId);
    if (routeNo !== undefined) candidate.routeNo = routeNo;
    if (item.priority !== undefined) candidate.priority = item.priority;
    candidates.push(candidate);
  }
  return candidates;
}

/** La cola de repaso del alcance pedido, ya ordenada por el motor. */
export async function queueFor(
  request: ScopeRequest,
  now: Date,
  database: DB = db,
): Promise<QueueCandidate[]> {
  const candidates = await collectCandidates(request, database);
  const schedule = (await database.schedules.get(R10.id)) ?? R10;
  const queueRequest: Parameters<typeof buildQueue>[0] = {
    scope: request.scope,
    candidates,
    schedule,
  };
  if (request.newLimit !== undefined) queueRequest.newLimit = request.newLimit;
  if (request.limit !== undefined) queueRequest.limit = request.limit;
  if (request.includeMastered !== undefined) queueRequest.includeMastered = request.includeMastered;
  return buildQueue(queueRequest, now);
}

/** Cuántos vencidos, nuevos, dominados y pausados hay, para la pantalla de Hoy. */
export async function countsFor(request: ScopeRequest, now: Date, database: DB = db) {
  const candidates = await collectCandidates(request, database);
  const schedule = (await database.schedules.get(R10.id)) ?? R10;
  return queueCounts(candidates, now, schedule);
}

/** Cuántos repasos caen cada día en los próximos `days` días. */
export async function forecast(
  days: number,
  now: Date,
  database: DB = db,
): Promise<{ date: string; count: number }[]> {
  const states = await database.reviewStates.toArray();
  const buckets = new Map<string, number>();
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }
  for (const state of states) {
    if (state.suspended || state.dueAt === null) continue;
    const key = state.dueAt.slice(0, 10);
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

/**
 * Racha de días seguidos estudiando, contando hacia atrás desde hoy.
 * Si hoy todavía no se ha estudiado pero ayer sí, la racha sigue viva.
 */
export async function studyStreak(now: Date, database: DB = db): Promise<number> {
  const logs = await database.reviewLogs.orderBy('at').reverse().limit(2000).toArray();
  if (logs.length === 0) return 0;

  const days = new Set(logs.map((log) => log.at.slice(0, 10)));
  const key = (date: Date): string =>
    `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const cursor = new Date(now);
  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
