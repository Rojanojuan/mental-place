import type {
  Deck,
  ID,
  Item,
  Locus,
  Palace,
  Schedule,
  SceneObject,
  Template,
  Zone,
} from '@/domain/types';
import { type PalacioDB, db } from './db';

/** Todas las operaciones aceptan otra base de datos: los tests crean la suya. */
type DB = PalacioDB;

// ------------------------------------------------------------------- palacios

export function listPalaces(database: DB = db): Promise<Palace[]> {
  return database.palaces.orderBy('order').toArray();
}

export function getPalace(id: ID, database: DB = db): Promise<Palace | undefined> {
  return database.palaces.get(id);
}

export async function putPalace(palace: Palace, database: DB = db): Promise<ID> {
  return database.palaces.put(palace);
}

/**
 * Borra un palacio con todo lo que cuelga de él, **menos los ítems**: estos
 * pasan a «sin asignar» para no perder contenido (contrato, Fase 2).
 */
export async function removePalace(id: ID, database: DB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.palaces, database.zones, database.loci, database.sceneObjects, database.items],
    async () => {
      const locusIds = await database.loci.where('palaceId').equals(id).primaryKeys();
      if (locusIds.length > 0) {
        await database.items.where('locusId').anyOf(locusIds).modify({ locusId: null });
        await database.sceneObjects.where('locusId').anyOf(locusIds).delete();
      }
      await database.loci.where('palaceId').equals(id).delete();
      await database.zones.where('palaceId').equals(id).delete();
      await database.palaces.delete(id);
    },
  );
}

// ---------------------------------------------------------------------- zonas

export function listZones(palaceId: ID, database: DB = db): Promise<Zone[]> {
  return database.zones
    .where('palaceId')
    .equals(palaceId)
    .toArray()
    .then((zones) => zones.sort((a, b) => a.order - b.order));
}

export async function putZone(zone: Zone, database: DB = db): Promise<ID> {
  return database.zones.put(zone);
}

/** Al borrar una zona, sus puntos se quedan sin zona; no se borran. */
export async function removeZone(id: ID, database: DB = db): Promise<void> {
  await database.transaction('rw', [database.zones, database.loci], async () => {
    await database.loci
      .where('zoneId')
      .equals(id)
      .modify((locus) => {
        delete locus.zoneId;
      });
    await database.zones.delete(id);
  });
}

// --------------------------------------------------------------------- puntos

export function listLoci(palaceId: ID, database: DB = db): Promise<Locus[]> {
  return database.loci
    .where('palaceId')
    .equals(palaceId)
    .toArray()
    .then((loci) => loci.sort((a, b) => a.routeNo - b.routeNo));
}

export function getLocus(id: ID, database: DB = db): Promise<Locus | undefined> {
  return database.loci.get(id);
}

export async function putLocus(locus: Locus, database: DB = db): Promise<ID> {
  return database.loci.put(locus);
}

/**
 * Borra un punto. Sus ítems pasan a «sin asignar» (`locusId: null`) y sus
 * objetos de escena, que solo tienen sentido ahí, se van con él.
 *
 * La ruta **no** se renumera: los números son referencias estables para el
 * import (`«Cuerpo 1 · L8»`). Para compactarla, `resequenceRoute()`.
 */
export async function removeLocus(id: ID, database: DB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.loci, database.sceneObjects, database.items],
    async () => {
      await database.items.where('locusId').equals(id).modify({ locusId: null });
      await database.sceneObjects.where('locusId').equals(id).delete();
      await database.loci.delete(id);
    },
  );
}

/** Mueve un punto a otra posición normalizada 0–1. */
export async function moveLocus(
  id: ID,
  pos: { x: number; y: number },
  database: DB = db,
): Promise<number> {
  return database.loci.update(id, { pos });
}

/**
 * Inserta un punto en la ruta, corriendo un número los que vengan detrás.
 * Es lo que hace falta al tocar un hueco dentro de una habitación.
 */
export async function insertLocus(locus: Locus, database: DB = db): Promise<ID> {
  return database.transaction('rw', database.loci, async () => {
    await database.loci
      .where('[palaceId+routeNo]')
      .between([locus.palaceId, locus.routeNo], [locus.palaceId, Infinity], true, true)
      .modify((other) => {
        other.routeNo += 1;
      });
    return database.loci.put(locus);
  });
}

/** Renumera la ruta de un palacio como 1…n, respetando el orden actual. */
export async function resequenceRoute(palaceId: ID, database: DB = db): Promise<number> {
  return database.transaction('rw', database.loci, async () => {
    const loci = await listLoci(palaceId, database);
    let changed = 0;
    for (const [index, locus] of loci.entries()) {
      const routeNo = index + 1;
      if (locus.routeNo !== routeNo) {
        await database.loci.update(locus.id, { routeNo });
        changed += 1;
      }
    }
    return changed;
  });
}

/** Reordena la ruta según la lista de ids que se le pasa. */
export async function reorderRoute(ids: ID[], database: DB = db): Promise<void> {
  await database.transaction('rw', database.loci, async () => {
    for (const [index, id] of ids.entries()) {
      await database.loci.update(id, { routeNo: index + 1 });
    }
  });
}

// ------------------------------------------------------- objetos de escena

export function listSceneObjects(locusId: ID, database: DB = db): Promise<SceneObject[]> {
  return database.sceneObjects
    .where('locusId')
    .equals(locusId)
    .toArray()
    .then((objects) => objects.sort((a, b) => a.order - b.order));
}

export async function putSceneObject(object: SceneObject, database: DB = db): Promise<ID> {
  return database.sceneObjects.put(object);
}

export async function removeSceneObject(id: ID, database: DB = db): Promise<void> {
  await database.sceneObjects.delete(id);
}

export async function reorderSceneObjects(ids: ID[], database: DB = db): Promise<void> {
  await database.transaction('rw', database.sceneObjects, async () => {
    for (const [index, id] of ids.entries()) {
      await database.sceneObjects.update(id, { order: index + 1 });
    }
  });
}

// ---------------------------------------------------------------------- ítems

export function getItem(id: ID, database: DB = db): Promise<Item | undefined> {
  return database.items.get(id);
}

export function listItemsByLocus(locusId: ID, database: DB = db): Promise<Item[]> {
  return database.items.where('locusId').equals(locusId).toArray();
}

/** Los ítems que todavía no están en ningún punto: la bandeja «Sin asignar». */
export function listUnassignedItems(database: DB = db): Promise<Item[]> {
  return database.items.filter((item) => item.locusId === null).toArray();
}

export function listItemsByDeck(deckId: ID, database: DB = db): Promise<Item[]> {
  return database.items.where('deckId').equals(deckId).toArray();
}

/** Los ítems de un palacio, en orden de ruta. */
export async function listItemsByPalace(palaceId: ID, database: DB = db): Promise<Item[]> {
  const loci = await listLoci(palaceId, database);
  const order = new Map(loci.map((locus, index) => [locus.id, index]));
  const items = await database.items
    .where('locusId')
    .anyOf(loci.map((locus) => locus.id))
    .toArray();
  return items.sort(
    (a, b) => (order.get(a.locusId ?? '') ?? 0) - (order.get(b.locusId ?? '') ?? 0),
  );
}

export async function putItem(item: Item, database: DB = db): Promise<ID> {
  return database.items.put(item);
}

export async function assignItem(
  itemId: ID,
  locusId: ID | null,
  database: DB = db,
): Promise<number> {
  return database.items.update(itemId, { locusId, updatedAt: new Date().toISOString() });
}

/**
 * Borra un ítem con su estado de repaso y su historial: sin el ítem, ninguno
 * de los dos significa nada y quedarían huérfanos.
 */
export async function removeItem(id: ID, database: DB = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.items, database.reviewStates, database.reviewLogs],
    async () => {
      await database.reviewLogs.where('itemId').equals(id).delete();
      await database.reviewStates.delete(id);
      await database.items.delete(id);
    },
  );
}

// ------------------------------------------- mazos, plantillas y horarios

export const listDecks = (database: DB = db): Promise<Deck[]> => database.decks.toArray();
export const getDeck = (id: ID, database: DB = db): Promise<Deck | undefined> =>
  database.decks.get(id);
export const putDeck = (deck: Deck, database: DB = db): Promise<ID> => database.decks.put(deck);

export const listTemplates = (database: DB = db): Promise<Template[]> =>
  database.templates.toArray();
export const getTemplate = (id: ID, database: DB = db): Promise<Template | undefined> =>
  database.templates.get(id);
export const putTemplate = (template: Template, database: DB = db): Promise<ID> =>
  database.templates.put(template);

export const listSchedules = (database: DB = db): Promise<Schedule[]> =>
  database.schedules.toArray();
export const getSchedule = (id: ID, database: DB = db): Promise<Schedule | undefined> =>
  database.schedules.get(id);
export const putSchedule = (schedule: Schedule, database: DB = db): Promise<ID> =>
  database.schedules.put(schedule);

// ----------------------------------------------------------------- ajustes

export async function getSetting<T>(key: string, fallback: T, database: DB = db): Promise<T> {
  const row = await database.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown, database: DB = db): Promise<string> {
  return database.settings.put({ key, value });
}
