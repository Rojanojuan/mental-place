import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Bundle, Item, Locus, Zone } from '@/domain/types';
import {
  clearAll,
  countsFor,
  db,
  ensurePresets,
  importBundle,
  queueFor,
  statusByLocus,
} from '@/db';
import { buildQueue } from '@/srs';

/**
 * Rendimiento a escala: 500 puntos y 10 000 ítems.
 *
 * La Fase 6 lo pedía y nunca se había medido; con 45 puntos y 44 ítems iba
 * sobrado, que no prueba nada. Aquí se arma un palacio grande de verdad y se
 * cronometran las tres operaciones que el usuario espera: pintar el mapa
 * (estado por punto), armar la cola y contar lo de hoy.
 *
 * Los topes son generosos a propósito —esto corre en CI, en una máquina
 * cualquiera— pero cortan de raíz un O(n²): si algo tarda segundos, falla.
 */

const PUNTOS = 500;
const ITEMS = 10_000;
const PALACE = 'pal-escala';
const AHORA = new Date(2026, 0, 1).toISOString();

function bundleGrande(): Bundle {
  const zones: Zone[] = Array.from({ length: 10 }, (_, z) => ({
    id: `zon-${String(z)}`,
    palaceId: PALACE,
    name: `Zona ${String(z + 1)}`,
    color: 'torso',
    order: z,
  }));

  const loci: Locus[] = Array.from({ length: PUNTOS }, (_, i) => ({
    id: `loc-${String(i)}`,
    palaceId: PALACE,
    zoneId: `zon-${String(i % 10)}`,
    routeNo: i + 1,
    partName: `Punto ${String(i + 1)}`,
    side: i % 2 === 0 ? 'front' : 'back',
    pos: { x: 0.2 + (i % 7) * 0.1, y: (i % 97) / 100 },
  }));

  const items: Item[] = Array.from({ length: ITEMS }, (_, i) => ({
    id: `itm-${String(i)}`,
    locusId: `loc-${String(i % PUNTOS)}`,
    title: `Ítem ${String(i + 1)}`,
    front: `¿Pregunta ${String(i + 1)}?`,
    back: `Respuesta ${String(i + 1)}`,
    blocks: [],
    tags: [],
    fields: {},
    priority: i % 5,
    origin: 'import',
    templateId: 'tpl-libre',
    createdAt: AHORA,
    updatedAt: AHORA,
  }));

  return {
    version: 1,
    palaces: [
      {
        id: PALACE,
        name: 'Palacio grande',
        kind: 'body_both',
        color: 'torso',
        order: 0,
        createdAt: AHORA,
        updatedAt: AHORA,
      },
    ],
    zones,
    loci,
    items,
  };
}

/** Milisegundos de `fn`, ya resuelto. */
async function cronometra(fn: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

describe('500 puntos y 10 000 ítems', () => {
  beforeAll(async () => {
    await clearAll(db);
    await ensurePresets(db);
    await importBundle(bundleGrande(), db);
  }, 120_000);

  afterAll(async () => {
    await clearAll(db);
  });

  it('la semilla grande entra entera', async () => {
    expect(await db.loci.count()).toBe(PUNTOS);
    expect(await db.items.count()).toBe(ITEMS);
  });

  it('el estado de los 500 puntos se calcula de una vez', async () => {
    const ms = await cronometra(() => statusByLocus(PALACE, new Date()));
    expect(ms).toBeLessThan(4000);
  });

  it('la cola de hoy se arma sin recorrer los 10 000 ítems de uno en uno', async () => {
    const ms = await cronometra(() => queueFor({ scope: 'today', palaceId: PALACE }, new Date()));
    expect(ms).toBeLessThan(4000);
  });

  it('los conteos de Hoy no se atascan', async () => {
    const ms = await cronometra(() => countsFor({ scope: 'today', palaceId: PALACE }, new Date()));
    expect(ms).toBeLessThan(4000);
  });

  it('el recorrido entero del palacio tampoco', async () => {
    const ms = await cronometra(() => queueFor({ scope: 'walk', palaceId: PALACE }, new Date()));
    expect(ms).toBeLessThan(4000);
  });

  it('el motor puro ordena 10 000 candidatos en un suspiro', () => {
    const now = new Date();
    const candidatos = Array.from({ length: ITEMS }, (_, i) => ({
      itemId: `itm-${String(i)}`,
      locusId: `loc-${String(i % PUNTOS)}`,
      routeNo: (i % PUNTOS) + 1,
      priority: i % 5,
      state: {
        itemId: `itm-${String(i)}`,
        scheduleId: 'sch-r10',
        stage: i % 10,
        dueAt: new Date(now.getTime() - (i % 500) * 60_000).toISOString(),
        lapses: 0,
        streak: 0,
        suspended: false,
      },
    }));
    const t0 = performance.now();
    const cola = buildQueue({ scope: 'today', candidates: candidatos, newLimit: 20 }, now);
    const ms = performance.now() - t0;
    expect(cola.length).toBeGreaterThan(0);
    // Es una ordenación: por debajo de medio segundo o hay algo cuadrático.
    expect(ms).toBeLessThan(500);
  });
});
