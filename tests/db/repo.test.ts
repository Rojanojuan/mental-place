import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PalacioDB } from '@/db';
import {
  assignItem,
  getLocus,
  importBundle,
  insertLocus,
  listItemsByLocus,
  listItemsByPalace,
  listLoci,
  listSceneObjects,
  listUnassignedItems,
  listZones,
  moveLocus,
  removeItem,
  removeLocus,
  removePalace,
  removeZone,
  reorderRoute,
  reorderSceneObjects,
  resequenceRoute,
  getSetting,
  setSetting,
} from '@/db';
import { freshDB, item, locus, miniBundle, palace } from './helpers';

let db: PalacioDB;

beforeEach(async () => {
  db = freshDB();
  await importBundle(miniBundle(), db);
});

afterEach(() => {
  db.close();
});

describe('lecturas ordenadas', () => {
  it('lista los puntos por número de ruta', async () => {
    const loci = await listLoci('pal-1', db);
    expect(loci.map((l) => l.routeNo)).toEqual([1, 2, 3]);
  });

  it('lista las zonas por orden', async () => {
    const zones = await listZones('pal-1', db);
    expect(zones.map((z) => z.id)).toEqual(['zon-a', 'zon-b']);
  });

  it('lista los objetos de escena por orden', async () => {
    const objects = await listSceneObjects('loc-1', db);
    expect(objects.map((o) => o.text)).toEqual(['Globo', 'Silla']);
  });

  it('lista los ítems de un palacio en orden de ruta', async () => {
    await reorderRoute(['loc-3', 'loc-2', 'loc-1'], db);
    const items = await listItemsByPalace('pal-1', db);
    expect(items.map((i) => i.id)).toEqual(['itm-3', 'itm-2', 'itm-1']);
  });
});

describe('borrar un punto · los ítems no se pierden', () => {
  it('los deja «sin asignar» en vez de borrarlos', async () => {
    await removeLocus('loc-1', db);
    expect(await getLocus('loc-1', db)).toBeUndefined();

    const orphan = await db.items.get('itm-1');
    expect(orphan).toBeDefined();
    expect(orphan?.locusId).toBeNull();

    const unassigned = await listUnassignedItems(db);
    expect(unassigned.map((i) => i.id)).toEqual(['itm-1']);
  });

  it('se lleva sus objetos de escena, que solo tienen sentido ahí', async () => {
    await removeLocus('loc-1', db);
    expect(await listSceneObjects('loc-1', db)).toEqual([]);
    expect(await db.sceneObjects.count()).toBe(0);
  });

  it('no toca los demás puntos ni sus ítems', async () => {
    await removeLocus('loc-1', db);
    expect((await listLoci('pal-1', db)).map((l) => l.id)).toEqual(['loc-2', 'loc-3']);
    expect((await listItemsByLocus('loc-2', db)).map((i) => i.id)).toEqual(['itm-2']);
  });

  it('no renumera la ruta: los números son referencias estables', async () => {
    await removeLocus('loc-1', db);
    expect((await listLoci('pal-1', db)).map((l) => l.routeNo)).toEqual([2, 3]);
  });
});

describe('borrar un palacio', () => {
  it('se lleva zonas, puntos y objetos de escena', async () => {
    await removePalace('pal-1', db);
    expect(await db.palaces.count()).toBe(0);
    expect(await db.zones.count()).toBe(0);
    expect(await db.loci.count()).toBe(0);
    expect(await db.sceneObjects.count()).toBe(0);
  });

  it('pero deja los ítems sin asignar', async () => {
    await removePalace('pal-1', db);
    expect(await db.items.count()).toBe(3);
    const unassigned = await listUnassignedItems(db);
    expect(unassigned).toHaveLength(3);
  });

  it('no toca otro palacio', async () => {
    await importBundle(
      {
        version: 1,
        palaces: [palace('pal-2', { order: 1 })],
        loci: [locus('loc-9', 'pal-2', 1)],
        items: [item('itm-9', 'loc-9')],
      },
      db,
    );
    await removePalace('pal-1', db);
    expect((await listLoci('pal-2', db)).map((l) => l.id)).toEqual(['loc-9']);
    expect((await db.items.get('itm-9'))?.locusId).toBe('loc-9');
  });
});

describe('borrar una zona', () => {
  it('deja los puntos sin zona, no los borra', async () => {
    await removeZone('zon-a', db);
    expect(await db.zones.count()).toBe(1);
    const loci = await listLoci('pal-1', db);
    expect(loci).toHaveLength(3);
    expect(loci[0]?.zoneId).toBeUndefined();
    expect(loci[1]?.zoneId).toBeUndefined();
    expect(loci[2]?.zoneId).toBe('zon-b');
  });
});

describe('borrar un ítem', () => {
  it('se lleva su estado de repaso y su historial', async () => {
    await db.reviewStates.put({
      itemId: 'itm-1',
      scheduleId: 'sch-r10',
      stage: 2,
      dueAt: null,
      lapses: 0,
      streak: 0,
      suspended: false,
    });
    await db.reviewLogs.put({
      id: 'log-1',
      itemId: 'itm-1',
      at: '2026-10-15T10:00:00.000Z',
      grade: 'good',
      stageBefore: 1,
      stageAfter: 2,
      intervalApplied: { value: 1, unit: 'd' },
      dueAt: '2026-10-16T06:00:00.000Z',
      manual: false,
    });

    await removeItem('itm-1', db);
    expect(await db.items.get('itm-1')).toBeUndefined();
    expect(await db.reviewStates.get('itm-1')).toBeUndefined();
    expect(await db.reviewLogs.count()).toBe(0);
  });
});

describe('mover y reasignar', () => {
  it('mueve un punto a otra posición normalizada', async () => {
    await moveLocus('loc-1', { x: 0.25, y: 0.75 }, db);
    expect((await getLocus('loc-1', db))?.pos).toEqual({ x: 0.25, y: 0.75 });
  });

  it('reasigna un ítem a otro punto', async () => {
    await assignItem('itm-1', 'loc-3', db);
    expect((await listItemsByLocus('loc-3', db)).map((i) => i.id).sort()).toEqual([
      'itm-1',
      'itm-3',
    ]);
  });

  it('desasigna un ítem a la bandeja', async () => {
    await assignItem('itm-1', null, db);
    expect((await listUnassignedItems(db)).map((i) => i.id)).toEqual(['itm-1']);
  });
});

describe('la ruta', () => {
  it('inserta un punto corriendo los de detrás', async () => {
    await insertLocus(locus('loc-nuevo', 'pal-1', 2), db);
    const loci = await listLoci('pal-1', db);
    expect(loci.map((l) => [l.id, l.routeNo])).toEqual([
      ['loc-1', 1],
      ['loc-nuevo', 2],
      ['loc-2', 3],
      ['loc-3', 4],
    ]);
  });

  it('inserta al final sin tocar a nadie', async () => {
    await insertLocus(locus('loc-nuevo', 'pal-1', 4), db);
    const loci = await listLoci('pal-1', db);
    expect(loci.map((l) => l.routeNo)).toEqual([1, 2, 3, 4]);
    expect(loci[3]?.id).toBe('loc-nuevo');
  });

  it('no corre los puntos de otro palacio', async () => {
    await importBundle(
      { version: 1, palaces: [palace('pal-2')], loci: [locus('loc-9', 'pal-2', 2)] },
      db,
    );
    await insertLocus(locus('loc-nuevo', 'pal-1', 1), db);
    expect((await getLocus('loc-9', db))?.routeNo).toBe(2);
  });

  it('compacta la numeración cuando se le pide', async () => {
    await removeLocus('loc-1', db);
    const changed = await resequenceRoute('pal-1', db);
    expect(changed).toBe(2);
    expect((await listLoci('pal-1', db)).map((l) => l.routeNo)).toEqual([1, 2]);
  });

  it('no cambia nada si ya está compacta', async () => {
    expect(await resequenceRoute('pal-1', db)).toBe(0);
  });

  it('reordena según la lista que se le da', async () => {
    await reorderRoute(['loc-2', 'loc-3', 'loc-1'], db);
    const loci = await listLoci('pal-1', db);
    expect(loci.map((l) => l.id)).toEqual(['loc-2', 'loc-3', 'loc-1']);
  });

  it('reordena los objetos de escena', async () => {
    await reorderSceneObjects(['sob-2', 'sob-1'], db);
    expect((await listSceneObjects('loc-1', db)).map((o) => o.text)).toEqual(['Silla', 'Globo']);
  });
});

describe('ajustes', () => {
  it('devuelve el valor por defecto si no hay nada guardado', async () => {
    expect(await getSetting('newLimit', 20, db)).toBe(20);
  });

  it('guarda y recupera', async () => {
    await setSetting('newLimit', 5, db);
    expect(await getSetting('newLimit', 20, db)).toBe(5);
  });

  it('distingue un valor guardado de la ausencia', async () => {
    await setSetting('showSheet', false, db);
    expect(await getSetting('showSheet', true, db)).toBe(false);
  });
});
