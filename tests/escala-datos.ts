import type { Bundle, Item, Locus, Zone } from '@/domain/types';

export const PUNTOS = 500;
export const ITEMS = 10_000;
export const PALACE = 'pal-escala';
const AHORA = new Date(2026, 0, 1).toISOString();

export function bundleGrande(): Bundle {
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
