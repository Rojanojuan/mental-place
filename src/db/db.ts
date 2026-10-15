import Dexie, { type Table } from 'dexie';
import type {
  Deck,
  ID,
  Item,
  Locus,
  Palace,
  ReviewLog,
  ReviewState,
  Schedule,
  SceneObject,
  Template,
  Zone,
} from '@/domain/types';

/**
 * Preferencias de la app guardadas como clave/valor. No está en el contrato:
 * es el sitio para el límite diario, la hora preferida, el tema o si la hoja
 * de próximo repaso se muestra siempre (ver docs/DECISIONES.md D-025).
 */
export interface Setting {
  key: string;
  value: unknown;
}

/**
 * IndexedDB vía Dexie. Las migraciones son versionadas: cada cambio de esquema
 * añade un `version(n).stores({…})` **nuevo**, nunca edita el anterior.
 *
 * Qué no se puede indexar en IndexedDB: los booleanos no son claves válidas,
 * así que `ReviewState.suspended` y `Locus.dense` se filtran en memoria. Las
 * filas con la clave indexada a `null`/`undefined` quedan fuera del índice
 * (por eso los ítems nuevos, con `dueAt: null`, no salen en una consulta por
 * rango de fechas y se buscan por `stage`).
 */
export class PalacioDB extends Dexie {
  palaces!: Table<Palace, ID>;
  zones!: Table<Zone, ID>;
  loci!: Table<Locus, ID>;
  sceneObjects!: Table<SceneObject, ID>;
  items!: Table<Item, ID>;
  decks!: Table<Deck, ID>;
  templates!: Table<Template, ID>;
  schedules!: Table<Schedule, ID>;
  reviewStates!: Table<ReviewState, ID>;
  reviewLogs!: Table<ReviewLog, ID>;
  settings!: Table<Setting, string>;

  constructor(name = 'palacio-corporal') {
    super(name);
    this.version(1).stores({
      palaces: 'id, order',
      zones: 'id, palaceId, order',
      loci: 'id, palaceId, zoneId, routeNo, [palaceId+routeNo], side',
      sceneObjects: 'id, locusId, order',
      items: 'id, locusId, deckId, templateId, priority, *tags',
      decks: 'id',
      templates: 'id',
      schedules: 'id',
      reviewStates: 'itemId, scheduleId, dueAt, stage',
      reviewLogs: 'id, itemId, at, [itemId+at]',
      settings: 'key',
    });
  }
}

/** Instancia única de la app. Los tests crean la suya con otro nombre. */
export const db = new PalacioDB();
