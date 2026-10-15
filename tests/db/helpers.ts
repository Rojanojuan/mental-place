import type { Bundle, Item, Locus, Palace, Zone } from '@/domain/types';
import { PalacioDB } from '@/db';

let counter = 0;

/** Una base de datos limpia por test, con su propio nombre. */
export function freshDB(): PalacioDB {
  counter += 1;
  return new PalacioDB(`test-${String(counter)}-${String(Date.now())}`);
}

const STAMP = '2026-10-15T12:00:00.000Z';

export function palace(id: string, extra: Partial<Palace> = {}): Palace {
  return {
    id,
    name: `Palacio ${id}`,
    kind: 'body_both',
    order: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  };
}

export function zone(id: string, palaceId: string, extra: Partial<Zone> = {}): Zone {
  return { id, palaceId, name: `Zona ${id}`, color: 'cabeza', order: 0, ...extra };
}

export function locus(
  id: string,
  palaceId: string,
  routeNo: number,
  extra: Partial<Locus> = {},
): Locus {
  return {
    id,
    palaceId,
    routeNo,
    partName: `Parte ${String(routeNo)}`,
    side: 'front',
    pos: { x: 0.5, y: 0.5 },
    ...extra,
  };
}

export function item(id: string, locusId: string | null, extra: Partial<Item> = {}): Item {
  return {
    id,
    locusId,
    templateId: 'tpl-libre',
    title: `Ítem ${id}`,
    blocks: [],
    tags: [],
    fields: {},
    origin: 'manual',
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  };
}

/** Un palacio pequeño: 1 palacio, 2 zonas, 3 puntos, 3 ítems. */
export function miniBundle(): Bundle {
  return {
    version: 1,
    palaces: [palace('pal-1')],
    zones: [zone('zon-a', 'pal-1'), zone('zon-b', 'pal-1', { order: 1, color: 'torso' })],
    loci: [
      locus('loc-1', 'pal-1', 1, { zoneId: 'zon-a' }),
      locus('loc-2', 'pal-1', 2, { zoneId: 'zon-a' }),
      locus('loc-3', 'pal-1', 3, { zoneId: 'zon-b', side: 'back' }),
    ],
    sceneObjects: [
      { id: 'sob-1', locusId: 'loc-1', text: 'Globo', order: 1 },
      { id: 'sob-2', locusId: 'loc-1', text: 'Silla', order: 2 },
    ],
    items: [
      item('itm-1', 'loc-1', { deckId: 'dck-1', priority: 1 }),
      item('itm-2', 'loc-2', { deckId: 'dck-1', priority: 2 }),
      item('itm-3', 'loc-3', { deckId: 'dck-1', priority: 3 }),
    ],
    decks: [{ id: 'dck-1', name: 'Mazo', scheduleId: 'sch-r10' }],
    templates: [{ id: 'tpl-libre', name: 'Libre', fields: [], blockOrder: ['text'] }],
    schedules: [],
  };
}
