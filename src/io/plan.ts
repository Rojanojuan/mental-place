import type {
  Bundle,
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
import { type PalacioDB, db } from '@/db';
import { type Catalog, resolveLocusRef } from './locus-ref';
import { bundleSchema } from './schema';

/** Las colecciones del paquete, sin `version`. */
export const COLLECTIONS = [
  'palaces',
  'zones',
  'loci',
  'sceneObjects',
  'items',
  'decks',
  'templates',
  'schedules',
] as const;

export type Collection = (typeof COLLECTIONS)[number];

export interface CollectionDiff {
  /** Ids que no existían: se crean. */
  create: number;
  /** Ids que ya existían: se sobrescriben. */
  update: number;
}

export interface UnresolvedRef {
  ref: string;
  title: string;
  reason: 'not-found' | 'ambiguous';
  candidates?: string[];
}

export interface ImportPlan {
  ok: boolean;
  /** Fallos de validación: con alguno, no se importa nada. */
  errors: { path: string; message: string }[];
  /** Cosas raras que no impiden importar. */
  warnings: string[];
  diff: Record<Collection, CollectionDiff>;
  unresolved: UnresolvedRef[];
  /** Resuelto y listo para `importBundle()`. `null` si hay errores. */
  bundle: Bundle | null;
}

export type ExistingIds = Record<Collection, Set<ID>>;

/**
 * Quita las claves con valor `undefined`.
 *
 * Zod devuelve los campos opcionales como `prop?: T | undefined`, mientras el
 * dominio los declara `prop?: T` (`exactOptionalPropertyTypes`). Quitar la
 * clave, en vez de dejarla valiendo `undefined`, hace que el objeto encaje de
 * verdad con el tipo del dominio —y evita guardar claves vacías en IndexedDB.
 *
 * La conversión de tipo es segura: la fila ya pasó por Zod.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- el genérico es el tipo de salida: así el cast queda en un solo sitio.
function clean<Out>(row: object): Out {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Out;
}

const emptyDiff = (): Record<Collection, CollectionDiff> =>
  Object.fromEntries(COLLECTIONS.map((name) => [name, { create: 0, update: 0 }])) as Record<
    Collection,
    CollectionDiff
  >;

/** Lee de la base lo necesario para resolver referencias por nombre. */
export async function readCatalog(database: PalacioDB = db): Promise<Catalog> {
  const [palaces, loci] = await Promise.all([database.palaces.toArray(), database.loci.toArray()]);
  return {
    palaces: palaces.map(({ id, name }) => ({ id, name })),
    loci: loci.map(({ id, palaceId, routeNo, partName, room }) =>
      room === undefined
        ? { id, palaceId, routeNo, partName }
        : { id, palaceId, routeNo, partName, room },
    ),
  };
}

/** Los ids que ya hay en cada tabla, para distinguir «crear» de «sobrescribir». */
export async function readExistingIds(database: PalacioDB = db): Promise<ExistingIds> {
  const entries = await Promise.all(
    COLLECTIONS.map(async (name) => {
      const keys = await database[name].toCollection().primaryKeys();
      return [name, new Set<ID>(keys)] as const;
    }),
  );
  return Object.fromEntries(entries) as ExistingIds;
}

/**
 * Vista previa de una importación: valida, cuenta qué se crea y qué se
 * sobrescribe, y resuelve las referencias `locusRef` por nombre.
 *
 * **No escribe nada.** Es el «dry-run» que pide el contrato: el usuario ve
 * exactamente lo que va a pasar antes de confirmar.
 */
export function planImport(raw: unknown, catalog: Catalog, existing: ExistingIds): ImportPlan {
  const parsed = bundleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(raíz)',
        message: issue.message,
      })),
      warnings: [],
      diff: emptyDiff(),
      unresolved: [],
      bundle: null,
    };
  }

  const input = parsed.data;
  const diff = emptyDiff();
  const warnings: string[] = [];
  const unresolved: UnresolvedRef[] = [];

  for (const name of COLLECTIONS) {
    for (const row of input[name] ?? []) {
      const key = name === 'items' ? row.id : row.id;
      if (existing[name].has(key)) diff[name].update += 1;
      else diff[name].create += 1;
    }
  }

  // Los ítems pueden venir con `locusRef` en vez de `locusId`.
  // Tipo inferido del esquema; se ajusta al dominio con `clean()` al final.
  const items = (input.items ?? []).map((raw_) => {
    const { locusRef, ...item } = raw_;
    if (locusRef === undefined) return item;

    const result = resolveLocusRef(locusRef, catalog);
    if (result.ok) return { ...item, locusId: result.locusId };

    unresolved.push({
      ref: locusRef,
      title: item.title,
      reason: result.reason,
      ...(result.candidates ? { candidates: result.candidates } : {}),
    });
    // Sin punto, el ítem entra «sin asignar»: el contenido no se pierde.
    return { ...item, locusId: null };
  });

  if (unresolved.length > 0) {
    warnings.push(
      `${String(unresolved.length)} ${unresolved.length === 1 ? 'ítem' : 'ítems'} sin punto: entrarán en «Sin asignar».`,
    );
  }

  // Integridad: solo avisos, porque un import parcial puede apuntar a lo que ya hay.
  const known = (name: Collection, id: ID): boolean =>
    existing[name].has(id) || (input[name] ?? []).some((row) => row.id === id);

  for (const zone of input.zones ?? []) {
    if (!known('palaces', zone.palaceId))
      warnings.push(`La zona «${zone.name}» apunta a un palacio que no existe.`);
  }
  for (const locus of input.loci ?? []) {
    if (!known('palaces', locus.palaceId))
      warnings.push(`El punto «${locus.partName}» apunta a un palacio que no existe.`);
    if (locus.zoneId !== undefined && !known('zones', locus.zoneId))
      warnings.push(`El punto «${locus.partName}» apunta a una zona que no existe.`);
  }
  for (const object of input.sceneObjects ?? []) {
    if (!known('loci', object.locusId))
      warnings.push(`El objeto de escena «${object.text}» apunta a un punto que no existe.`);
  }
  for (const item of items) {
    if (!known('templates', item.templateId))
      warnings.push(`El ítem «${item.title}» usa una plantilla que no existe.`);
    if (item.locusId !== null && !known('loci', item.locusId))
      warnings.push(`El ítem «${item.title}» apunta a un punto que no existe.`);
  }

  const routeClashes = new Map<string, number>();
  for (const locus of input.loci ?? []) {
    const key = `${locus.palaceId}#${String(locus.routeNo)}`;
    routeClashes.set(key, (routeClashes.get(key) ?? 0) + 1);
  }
  for (const [key, count] of routeClashes) {
    if (count > 1)
      warnings.push(`Hay ${String(count)} puntos con el mismo número de ruta (${key}).`);
  }

  const bundle: Bundle = { version: 1 };
  if (input.palaces) bundle.palaces = input.palaces.map((row) => clean<Palace>(row));
  if (input.zones) bundle.zones = input.zones.map((row) => clean<Zone>(row));
  if (input.loci) bundle.loci = input.loci.map((row) => clean<Locus>(row));
  if (input.sceneObjects)
    bundle.sceneObjects = input.sceneObjects.map((row) => clean<SceneObject>(row));
  if (input.items) bundle.items = items.map((row) => clean<Item>(row));
  if (input.decks) bundle.decks = input.decks.map((row) => clean<Deck>(row));
  if (input.templates) bundle.templates = input.templates.map((row) => clean<Template>(row));
  if (input.schedules) bundle.schedules = input.schedules.map((row) => clean<Schedule>(row));

  return { ok: true, errors: [], warnings, diff, unresolved, bundle };
}

/** Cuántas filas toca el plan en total. */
export function planTotal(plan: ImportPlan): { create: number; update: number } {
  return COLLECTIONS.reduce(
    (acc, name) => ({
      create: acc.create + plan.diff[name].create,
      update: acc.update + plan.diff[name].update,
    }),
    { create: 0, update: 0 },
  );
}
