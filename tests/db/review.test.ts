import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PalacioDB } from '@/db';
import {
  applyGrade,
  applyOverride,
  countsFor,
  ensurePresets,
  ensureReviewState,
  forecast,
  importBundle,
  listLogs,
  previewForItem,
  proposeGrade,
  queueFor,
  resolveSchedule,
  setSuspended,
  statusByLocus,
} from '@/db';
import { CLASSIC, R10 } from '@/srs';
import { freshDB, item, miniBundle } from './helpers';

const NOW = new Date(2026, 9, 15, 19, 40);
let db: PalacioDB;

beforeEach(async () => {
  db = freshDB();
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

afterEach(() => {
  db.close();
});

describe('estado de repaso', () => {
  it('se crea solo la primera vez que se necesita', async () => {
    expect(await db.reviewStates.count()).toBe(0);
    const state = await ensureReviewState('itm-1', db);
    expect(state).toMatchObject({ itemId: 'itm-1', stage: 0, dueAt: null, suspended: false });
    expect(await db.reviewStates.count()).toBe(1);
  });

  it('no se duplica si ya existe', async () => {
    const first = await ensureReviewState('itm-1', db);
    await applyGrade('itm-1', 'good', NOW, {}, db);
    const second = await ensureReviewState('itm-1', db);
    expect(second.stage).toBe(1);
    expect(first.stage).toBe(0);
    expect(await db.reviewStates.count()).toBe(1);
  });

  it('protesta si el ítem no existe', async () => {
    await expect(ensureReviewState('no-existe', db)).rejects.toThrow('No existe el ítem');
  });

  it('se puede pausar y reanudar', async () => {
    await setSuspended('itm-1', true, db);
    expect((await db.reviewStates.get('itm-1'))?.suspended).toBe(true);
    await setSuspended('itm-1', false, db);
    expect((await db.reviewStates.get('itm-1'))?.suspended).toBe(false);
  });
});

describe('qué horario usa cada ítem', () => {
  it('el de su mazo', async () => {
    await db.decks.put({ id: 'dck-1', name: 'Mazo', scheduleId: CLASSIC.id });
    const item = await db.items.get('itm-1');
    expect((await resolveSchedule(item!, db)).id).toBe(CLASSIC.id);
  });

  it('R10 si el mazo no declara ninguno', async () => {
    await db.decks.put({ id: 'dck-1', name: 'Mazo' });
    const item = await db.items.get('itm-1');
    expect((await resolveSchedule(item!, db)).id).toBe(R10.id);
  });

  it('R10 si el ítem no tiene mazo', async () => {
    // `item()` del helper no declara `deckId`.
    expect((await resolveSchedule(item('itm-solo', 'loc-1'), db)).id).toBe(R10.id);
  });
});

describe('calificar', () => {
  it('guarda el estado y el log en una sola pasada', async () => {
    const result = await applyGrade('itm-1', 'good', NOW, {}, db);
    expect(result.state.stage).toBe(1);

    const stored = await db.reviewStates.get('itm-1');
    expect(stored?.stage).toBe(1);
    expect(stored?.dueAt).toBe(result.proposedDueAt.toISOString());

    const logs = await listLogs('itm-1', db);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ grade: 'good', stageBefore: 0, stageAfter: 1, manual: false });
  });

  it('acumula el historial en orden', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    await applyGrade('itm-1', 'good', new Date(2026, 9, 16, 8, 0), {}, db);
    await applyGrade('itm-1', 'again', new Date(2026, 9, 17, 8, 0), {}, db);

    const logs = await listLogs('itm-1', db);
    expect(logs.map((l) => l.grade)).toEqual(['good', 'good', 'again']);
    expect(logs.map((l) => l.stageAfter)).toEqual([1, 2, 1]);
    expect((await db.reviewStates.get('itm-1'))?.lapses).toBe(1);
  });

  it('usa el horario del mazo', async () => {
    await db.decks.put({ id: 'dck-1', name: 'Mazo', scheduleId: CLASSIC.id });
    // En «Clásico» la etapa 1 es 1 día, no 10 minutos.
    const result = await applyGrade('itm-1', 'good', NOW, {}, db);
    expect(result.interval).toEqual({ value: 1, unit: 'd' });
  });

  it('propone sin guardar', async () => {
    const proposal = await proposeGrade('itm-1', 'easy', NOW, db);
    expect(proposal.state.stage).toBe(2);
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(0);
    expect(await db.reviewLogs.count()).toBe(0);
  });

  it('da los cuatro botones con su intervalo', async () => {
    const preview = await previewForItem('itm-1', NOW, db);
    expect(preview.again.label).toBe('10 min');
    expect(preview.good.label).toBe('10 min');
    expect(preview.easy.label).toBe('1 d');
  });
});

describe('fijar el próximo repaso a mano', () => {
  it('guarda un solo log, marcado como manual', async () => {
    const target = new Date(2026, 11, 24, 10, 0);
    const result = await applyOverride('itm-1', { at: target }, NOW, { grade: 'good' }, db);

    expect(result.log.manual).toBe(true);
    expect(result.log.grade).toBe('good');
    expect(await db.reviewLogs.count()).toBe(1);
    expect((await db.reviewStates.get('itm-1'))?.dueAt).toBe(target.toISOString());
  });

  it('aplica primero la calificación y luego la fecha', async () => {
    // «Fácil» desde nuevo lleva a la etapa 2; el usuario además fija la fecha.
    const target = new Date(2026, 10, 1, 9, 0);
    const result = await applyOverride('itm-1', { at: target }, NOW, { grade: 'easy' }, db);
    expect(result.state.stage).toBe(2);
    expect(result.log.stageBefore).toBe(0);
    expect(result.log.stageAfter).toBe(2);
  });

  it('salta a la etapa pedida y el horario sigue desde ahí', async () => {
    await applyOverride('itm-1', { stage: 6 }, NOW, { grade: 'good' }, db);
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(6);

    const next = await applyGrade('itm-1', 'good', new Date(2026, 10, 14, 8, 0), {}, db);
    expect(next.state.stage).toBe(7);
    expect(next.interval).toEqual({ value: 60, unit: 'd' });
  });

  it('suma un intervalo sin tocar la etapa', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    const result = await applyOverride(
      'itm-1',
      { addInterval: { value: 3, unit: 'd' } },
      NOW,
      {},
      db,
    );
    expect(result.state.stage).toBe(1);
    expect(result.proposedDueAt).toEqual(new Date(2026, 9, 18, 8, 0));
  });
});

describe('estado de los puntos para el mapa', () => {
  it('un punto con un ítem sin estudiar está «new»', async () => {
    expect(await statusByLocus('pal-1', NOW, db)).toEqual({
      'loc-1': 'new',
      'loc-2': 'new',
      'loc-3': 'new',
    });
  });

  it('un punto sin ítems está «empty»', async () => {
    await db.items.delete('itm-2');
    expect((await statusByLocus('pal-1', NOW, db))['loc-2']).toBe('empty');
  });

  it('pasa a «learning» tras calificar', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    expect((await statusByLocus('pal-1', NOW, db))['loc-1']).toBe('learning');
  });

  it('pasa a «due» cuando llega la fecha', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    const later = new Date(2026, 9, 15, 20, 0); // 20 min después: ya vencieron los 10 min
    expect((await statusByLocus('pal-1', later, db))['loc-1']).toBe('due');
  });

  it('toma el estado más urgente de los ítems del punto', async () => {
    await db.items.put({ ...(await db.items.get('itm-2'))!, id: 'itm-2b', locusId: 'loc-1' });
    await applyGrade('itm-1', 'good', NOW, {}, db); // learning
    // itm-2b sigue nuevo: «new» es menos urgente que «learning».
    expect((await statusByLocus('pal-1', NOW, db))['loc-1']).toBe('learning');
  });

  it('un ítem pausado deja el punto «suspended»', async () => {
    await setSuspended('itm-1', true, db);
    expect((await statusByLocus('pal-1', NOW, db))['loc-1']).toBe('suspended');
  });
});

describe('colas', () => {
  it('la cola de hoy trae los nuevos por prioridad', async () => {
    const queue = await queueFor({ scope: 'today' }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-1', 'itm-2', 'itm-3']);
  });

  it('pone lo vencido antes que lo nuevo', async () => {
    await applyGrade('itm-3', 'good', NOW, {}, db);
    const later = new Date(2026, 9, 15, 20, 0);
    const queue = await queueFor({ scope: 'today' }, later, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-3', 'itm-1', 'itm-2']);
  });

  it('respeta el límite diario de nuevos', async () => {
    const queue = await queueFor({ scope: 'today', newLimit: 2 }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-1', 'itm-2']);
  });

  it('se puede acotar a un punto', async () => {
    const queue = await queueFor({ scope: 'locus', locusId: 'loc-2' }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-2']);
  });

  it('se puede acotar a una zona', async () => {
    const queue = await queueFor({ scope: 'zone', zoneId: 'zon-a' }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-1', 'itm-2']);
  });

  it('el recorrido va en orden de ruta, sin filtrar por vencimiento', async () => {
    await applyGrade('itm-1', 'easy', NOW, {}, db); // su repaso cae dentro de 1 día
    const queue = await queueFor({ scope: 'walk', palaceId: 'pal-1' }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-1', 'itm-2', 'itm-3']);
  });

  it('deja fuera los pausados', async () => {
    await setSuspended('itm-2', true, db);
    const queue = await queueFor({ scope: 'today' }, NOW, db);
    expect(queue.map((c) => c.itemId)).toEqual(['itm-1', 'itm-3']);
  });

  it('cuenta por estado', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    await setSuspended('itm-2', true, db);
    const later = new Date(2026, 9, 15, 20, 0);
    expect(await countsFor({ scope: 'today' }, later, db)).toEqual({
      due: 1,
      new: 1,
      mastered: 0,
      suspended: 1,
    });
  });
});

describe('previsión', () => {
  it('reparte los repasos por día', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db); // hoy + 10 min
    await applyGrade('itm-2', 'easy', NOW, {}, db); // mañana a las 8:00
    const days = await forecast(3, NOW, db);
    expect(days).toHaveLength(3);
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(2);
  });

  it('no cuenta los pausados', async () => {
    await applyGrade('itm-1', 'good', NOW, {}, db);
    await setSuspended('itm-1', true, db);
    const days = await forecast(3, NOW, db);
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });
});
