import type { Bundle } from '@/domain/types';
import { PRESETS, R10 } from '@/srs';
import { type PalacioDB, db } from './db';

type DB = PalacioDB;

export interface ImportCounts {
  palaces: number;
  zones: number;
  loci: number;
  sceneObjects: number;
  items: number;
  decks: number;
  templates: number;
  schedules: number;
}

const EMPTY_COUNTS: ImportCounts = {
  palaces: 0,
  zones: 0,
  loci: 0,
  sceneObjects: 0,
  items: 0,
  decks: 0,
  templates: 0,
  schedules: 0,
};

/**
 * Carga un paquete JSON v1 en la base de datos, todo o nada.
 *
 * Aquí no se valida: la Fase 3 pone los esquemas Zod delante, con vista previa
 * de cambios. Esta función es el último paso, el que escribe.
 */
export async function importBundle(bundle: Bundle, database: DB = db): Promise<ImportCounts> {
  const counts = { ...EMPTY_COUNTS };
  await database.transaction(
    'rw',
    [
      database.palaces,
      database.zones,
      database.loci,
      database.sceneObjects,
      database.items,
      database.decks,
      database.templates,
      database.schedules,
    ],
    async () => {
      if (bundle.palaces)
        counts.palaces = (await database.palaces.bulkPut(bundle.palaces, { allKeys: true })).length;
      if (bundle.zones)
        counts.zones = (await database.zones.bulkPut(bundle.zones, { allKeys: true })).length;
      if (bundle.loci)
        counts.loci = (await database.loci.bulkPut(bundle.loci, { allKeys: true })).length;
      if (bundle.sceneObjects)
        counts.sceneObjects = (
          await database.sceneObjects.bulkPut(bundle.sceneObjects, { allKeys: true })
        ).length;
      if (bundle.items)
        counts.items = (await database.items.bulkPut(bundle.items, { allKeys: true })).length;
      if (bundle.decks)
        counts.decks = (await database.decks.bulkPut(bundle.decks, { allKeys: true })).length;
      if (bundle.templates)
        counts.templates = (
          await database.templates.bulkPut(bundle.templates, { allKeys: true })
        ).length;
      if (bundle.schedules)
        counts.schedules = (
          await database.schedules.bulkPut(bundle.schedules, { allKeys: true })
        ).length;
    },
  );
  return counts;
}

/** Exporta todo como copia de seguridad, en el formato JSON v1 del contrato. */
export async function exportBundle(database: DB = db): Promise<Bundle> {
  const [palaces, zones, loci, sceneObjects, items, decks, templates, schedules] =
    await Promise.all([
      database.palaces.toArray(),
      database.zones.toArray(),
      database.loci.toArray(),
      database.sceneObjects.toArray(),
      database.items.toArray(),
      database.decks.toArray(),
      database.templates.toArray(),
      database.schedules.toArray(),
    ]);
  return { version: 1, palaces, zones, loci, sceneObjects, items, decks, templates, schedules };
}

/** Deja la base vacía. El estado de repaso y el historial también se van. */
export async function clearAll(database: DB = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
  });
}

export async function isEmpty(database: DB = db): Promise<boolean> {
  return (await database.palaces.count()) === 0 && (await database.items.count()) === 0;
}

/** Deja los cinco presets del contrato en la base si no están ya. */
export async function ensurePresets(database: DB = db): Promise<void> {
  const existing = new Set(await database.schedules.toCollection().primaryKeys());
  const missing = PRESETS.filter((preset) => !existing.has(preset.id));
  if (missing.length > 0) await database.schedules.bulkAdd(missing);
}

/**
 * Siembra la base la primera vez. No pisa nada: si ya hay contenido, solo se
 * asegura de que estén los presets.
 */
export async function seedIfEmpty(bundle: Bundle, database: DB = db): Promise<ImportCounts | null> {
  await ensurePresets(database);
  if (!(await isEmpty(database))) return null;
  const counts = await importBundle(bundle, database);
  await ensurePresets(database);
  return counts;
}

export { R10 };
