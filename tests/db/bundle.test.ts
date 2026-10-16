import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Bundle } from '@/domain/types';
import type { PalacioDB } from '@/db';
import {
  clearAll,
  ensurePresets,
  exportBundle,
  importBundle,
  isEmpty,
  listLoci,
  seedIfEmpty,
  statusByLocus,
} from '@/db';
import { PRESETS } from '@/srs';
import { freshDB, miniBundle } from './helpers';

let db: PalacioDB;

beforeEach(() => {
  db = freshDB();
});

afterEach(() => {
  db.close();
});

describe('importBundle', () => {
  it('cuenta lo que ha escrito', async () => {
    const counts = await importBundle(miniBundle(), db);
    expect(counts).toEqual({
      palaces: 1,
      zones: 2,
      loci: 3,
      sceneObjects: 2,
      items: 3,
      decks: 1,
      templates: 1,
      schedules: 0,
    });
  });

  it('acepta un paquete parcial: solo ítems', async () => {
    await importBundle(miniBundle(), db);
    const counts = await importBundle(
      {
        version: 1,
        items: [
          {
            id: 'itm-nuevo',
            locusId: null,
            templateId: 'tpl-libre',
            title: 'Suelto',
            blocks: [],
            tags: [],
            fields: {},
            origin: 'import',
            createdAt: '2026-10-15T12:00:00.000Z',
            updatedAt: '2026-10-15T12:00:00.000Z',
          },
        ],
      },
      db,
    );
    expect(counts.items).toBe(1);
    expect(counts.loci).toBe(0);
    expect(await db.items.count()).toBe(4);
    expect(await db.loci.count()).toBe(3);
  });

  it('es idempotente: reimportar no duplica', async () => {
    await importBundle(miniBundle(), db);
    await importBundle(miniBundle(), db);
    expect(await db.loci.count()).toBe(3);
    expect(await db.items.count()).toBe(3);
  });

  it('un paquete vacío no escribe nada', async () => {
    expect(await importBundle({ version: 1 }, db)).toEqual({
      palaces: 0,
      zones: 0,
      loci: 0,
      sceneObjects: 0,
      items: 0,
      decks: 0,
      templates: 0,
      schedules: 0,
    });
    expect(await isEmpty(db)).toBe(true);
  });
});

describe('exportBundle', () => {
  it('devuelve lo guardado en el formato del contrato', async () => {
    await importBundle(miniBundle(), db);
    const out = await exportBundle(db);
    expect(out.version).toBe(1);
    expect(out.loci).toHaveLength(3);
    expect(out.items).toHaveLength(3);
    expect(Object.keys(out).sort()).toEqual([
      'decks',
      'items',
      'loci',
      'palaces',
      'sceneObjects',
      'schedules',
      'templates',
      'version',
      'zones',
    ]);
  });

  it('ida y vuelta sin pérdida', async () => {
    await importBundle(miniBundle(), db);
    const exported = await exportBundle(db);

    const other = freshDB();
    await importBundle(exported, other);
    expect(await exportBundle(other)).toEqual(exported);
    other.close();
  });
});

describe('presets y siembra', () => {
  it('deja los cinco presets del contrato', async () => {
    await ensurePresets(db);
    expect(await db.schedules.count()).toBe(PRESETS.length);
  });

  it('no los duplica al llamarla dos veces', async () => {
    await ensurePresets(db);
    await ensurePresets(db);
    expect(await db.schedules.count()).toBe(PRESETS.length);
  });

  it('siembra la primera vez', async () => {
    const counts = await seedIfEmpty(miniBundle(), db);
    expect(counts?.loci).toBe(3);
    expect(await isEmpty(db)).toBe(false);
  });

  it('no pisa nada si ya hay contenido', async () => {
    await importBundle(miniBundle(), db);
    await db.items.update('itm-1', { title: 'Editado por el usuario' });

    expect(await seedIfEmpty(miniBundle(), db)).toBeNull();
    expect((await db.items.get('itm-1'))?.title).toBe('Editado por el usuario');
  });

  it('pero sí se asegura de los presets', async () => {
    await importBundle(miniBundle(), db);
    await seedIfEmpty(miniBundle(), db);
    expect(await db.schedules.count()).toBe(PRESETS.length);
  });
});

describe('clearAll', () => {
  it('deja la base vacía, historial incluido', async () => {
    await importBundle(miniBundle(), db);
    await db.reviewStates.put({
      itemId: 'itm-1',
      scheduleId: 'sch-r10',
      stage: 3,
      dueAt: null,
      lapses: 0,
      streak: 0,
      suspended: false,
    });

    await clearAll(db);
    expect(await isEmpty(db)).toBe(true);
    expect(await db.reviewStates.count()).toBe(0);
    for (const table of db.tables) expect(await table.count(), table.name).toBe(0);
  });
});

describe('la semilla de fonética entra entera', () => {
  const seed = JSON.parse(
    readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8'),
  ) as Bundle;

  it('carga los 45 puntos y 44 ítems', async () => {
    const counts = await importBundle(seed, db);
    expect(counts.loci).toBe(45);
    expect(counts.items).toBe(44);
    expect(counts.sceneObjects).toBe(80);
    expect(counts.zones).toBe(5);
  });

  it('mantiene la ruta 1…45 al leerla de vuelta', async () => {
    await importBundle(seed, db);
    const loci = await listLoci('pal-fonetica45', db);
    expect(loci.map((l) => l.routeNo)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });

  it('deja el punto 34 vacío y los otros 44 por estudiar', async () => {
    await importBundle(seed, db);
    await ensurePresets(db);
    const statuses = await statusByLocus('pal-fonetica45', new Date(2026, 9, 15), db);
    const counts = Object.values(statuses).reduce<Record<string, number>>((acc, state) => {
      acc[state] = (acc[state] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ new: 44, empty: 1 });
    expect(statuses['loc-fonetica45-34']).toBe('empty');
  });

  it('sobrevive a una ida y vuelta por la base de datos', async () => {
    await importBundle(seed, db);
    const out = await exportBundle(db);
    expect(out.items).toHaveLength(44);
    const frente = out.items?.find((i) => i.fields.routeNo === 2);
    expect(frente?.title).toBe('Frente · /iː/');
    expect(frente?.blocks).toHaveLength(9);
  });
});
