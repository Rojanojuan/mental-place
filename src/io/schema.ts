import { z } from 'zod';

/**
 * Esquemas Zod del formato JSON v1 del contrato (§5).
 *
 * Reflejan `src/domain/types.ts` uno a uno. Son la frontera: todo lo que entra
 * por importación pasa por aquí, así que después de validar se puede confiar en
 * los datos sin más comprobaciones.
 */

const id = z.string().min(1, 'el id no puede estar vacío');
const iso = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'no es una fecha ISO válida');

const zoneAccent = z.enum(['cabeza', 'hombros', 'torso', 'brazos', 'piernas']);

export const unitSchema = z.enum(['min', 'h', 'd', 'w', 'mo']);
export const gradeSchema = z.enum(['again', 'hard', 'good', 'easy']);
export const locusStateSchema = z.enum([
  'empty',
  'new',
  'learning',
  'due',
  'review',
  'mastered',
  'suspended',
]);

export const palaceStyleSchema = z.object({
  accent: zoneAccent,
  draw: z.enum(['atlas', 'lapiz', 'neon']),
  skin: z.enum(['neutral', 'porcelana', 'arena', 'miel', 'canela', 'ebano', 'plano']),
  hair: z.enum(['none', 'buzz', 'short', 'curly', 'tail', 'bun', 'long']),
  hairColor: z.string(),
  facial: z.enum(['none', 'stache', 'beard']),
  glasses: z.boolean(),
  detail: z.enum(['min', 'med', 'full']),
  vol: z.enum(['shade', 'flat']),
  line: z.enum(['fine', 'bold']),
});

export const roomSchema = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  zone: zoneAccent,
  lx: z.number().optional(),
  ly: z.number().optional(),
  sub: z.string().optional(),
});

export const palaceSchema = z.object({
  id,
  name: z.string().min(1),
  kind: z.enum(['body_front', 'body_back', 'body_both', 'custom_image', 'custom_plan']),
  imageRef: z.string().optional(),
  color: z.string().optional(),
  style: palaceStyleSchema.optional(),
  aspect: z.number().positive().optional(),
  planData: z.object({ svg: z.string(), w: z.number(), h: z.number() }).optional(),
  rooms: z.array(roomSchema).optional(),
  order: z.number().int(),
  createdAt: iso,
  updatedAt: iso,
});

export const zoneSchema = z.object({
  id,
  palaceId: id,
  name: z.string().min(1),
  color: z.string(),
  order: z.number().int(),
});

/** Las coordenadas van normalizadas 0–1: es lo que hace el mapa reutilizable. */
const position = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const locusSchema = z.object({
  id,
  palaceId: id,
  zoneId: id.optional(),
  routeNo: z.number().int().positive(),
  partName: z.string().min(1),
  side: z.enum(['front', 'back']),
  pos: position,
  anchor: z.object({ text: z.string(), media: z.string().optional() }).optional(),
  notes: z.string().optional(),
  dense: z.boolean().optional(),
  room: z.string().optional(),
});

export const sceneObjectSchema = z.object({
  id,
  locusId: id,
  text: z.string().min(1),
  represents: z.string().optional(),
  media: z.string().optional(),
  order: z.number().int(),
});

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), md: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({
    type: z.literal('table'),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal('bilingual'),
    en: z.string(),
    es: z.string(),
    tag: z.enum(['base', 'cotidiano', 'c1']).optional(),
  }),
  z.object({
    type: z.literal('error'),
    wrong: z.string(),
    right: z.string(),
    why: z.string().optional(),
  }),
  z.object({ type: z.literal('image'), src: z.string(), alt: z.string() }),
  z.object({ type: z.literal('note'), md: z.string() }),
]);

export const itemSchema = z.object({
  id,
  locusId: id.nullable(),
  deckId: id.optional(),
  templateId: id,
  title: z.string().min(1),
  front: z.string().optional(),
  back: z.string().optional(),
  blocks: z.array(blockSchema),
  tags: z.array(z.string()),
  fields: z.record(z.string(), z.unknown()),
  priority: z.number().optional(),
  origin: z.enum(['manual', 'import', 'ai']),
  createdAt: iso,
  updatedAt: iso,
});

export const deckSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string().optional(),
  templateId: id.optional(),
  scheduleId: id.optional(),
});

export const templateSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string(),
      kind: z.enum(['text', 'longtext', 'number', 'list', 'table', 'object']),
      hint: z.string().optional(),
    }),
  ),
  blockOrder: z.array(z.enum(['text', 'list', 'table', 'bilingual', 'error', 'image', 'note'])),
});

export const intervalSchema = z.object({ value: z.number().positive(), unit: unitSchema });

export const scheduleSchema = z.object({
  id,
  name: z.string().min(1),
  mode: z.enum(['checkpoints', 'adaptive']),
  intervals: z.array(intervalSchema).min(1, 'un horario necesita al menos un intervalo'),
  rules: z.object({
    againAction: z.enum(['reset', 'back1', 'back2']),
    hardFactor: z.number().positive(),
    easySkip: z.number().int().min(1),
    minInterval: intervalSchema,
    dayStartHour: z.number().int().min(0).max(23),
  }),
});

/**
 * El paquete completo. Todas las colecciones son opcionales: el contrato
 * permite el import parcial (p. ej. solo `items` con `locusRef`).
 *
 * `items` acepta además `locusRef`, una referencia por texto («Cuerpo 1 · L8»,
 * «Casa familiar · 37» o el nombre de la parte) que se resuelve al importar.
 */
export const bundleSchema = z.object({
  version: z.literal(1),
  palaces: z.array(palaceSchema).optional(),
  zones: z.array(zoneSchema).optional(),
  loci: z.array(locusSchema).optional(),
  sceneObjects: z.array(sceneObjectSchema).optional(),
  items: z.array(itemSchema.extend({ locusRef: z.string().optional() })).optional(),
  decks: z.array(deckSchema).optional(),
  templates: z.array(templateSchema).optional(),
  schedules: z.array(scheduleSchema).optional(),
});

export type ParsedBundle = z.infer<typeof bundleSchema>;
export type ParsedItem = z.infer<typeof itemSchema> & { locusRef?: string };
