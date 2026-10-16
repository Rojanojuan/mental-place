// Tipos base del CONTRATO COMPARTIDO §2.
// Los campos añadidos durante el diseño están marcados y documentados en
// docs/HANDOFF_DISENO.md §3. Los planos de casa (planData / rooms) llegan en su fase.

export type ID = string;
export type LocusState = 'empty' | 'new' | 'learning' | 'due' | 'review' | 'mastered' | 'suspended';
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type Unit = 'min' | 'h' | 'd' | 'w' | 'mo';

/** Zonas del cuerpo que dan nombre a los tokens `--zone-*`. */
export type ZoneAccent = 'cabeza' | 'hombros' | 'torso' | 'brazos' | 'piernas';

/**
 * Apariencia del cuerpo. [AMPLÍA CONTRATO] — PROMPT_MEJORAS.md §2.
 * En palacios sin cuerpo solo aplican `accent` y `line`.
 */
export interface PalaceStyle {
  accent: ZoneAccent;
  draw: 'atlas' | 'lapiz' | 'neon';
  skin: 'neutral' | 'porcelana' | 'arena' | 'miel' | 'canela' | 'ebano' | 'plano';
  hair: 'none' | 'buzz' | 'short' | 'curly' | 'tail' | 'bun' | 'long';
  hairColor: string;
  facial: 'none' | 'stache' | 'beard';
  glasses: boolean;
  detail: 'min' | 'med' | 'full';
  vol: 'shade' | 'flat';
  line: 'fine' | 'bold';
}

export const PALACE_STYLE_DEFAULTS: PalaceStyle = {
  accent: 'cabeza',
  draw: 'atlas',
  skin: 'neutral',
  hair: 'none',
  hairColor: 'var(--line-2)',
  facial: 'none',
  glasses: false,
  detail: 'full',
  vol: 'shade',
  line: 'fine',
};

/** Una habitación de un plano. [AMPLÍA CONTRATO] — PROMPT_MEJORAS.md §4. */
export interface Room {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zone: ZoneAccent;
  /** Posición de la etiqueta. */
  lx?: number;
  ly?: number;
  sub?: string;
}

export interface Palace {
  id: ID;
  name: string;
  /** `custom_plan` (plano de casa generado) [AMPLÍA CONTRATO] — PROMPT_MEJORAS.md §4. */
  kind: 'body_front' | 'body_back' | 'body_both' | 'custom_image' | 'custom_plan';
  imageRef?: string;
  color?: string;
  /** [AMPLÍA CONTRATO] Apariencia del cuerpo. */
  style?: PalaceStyle;
  /** [AMPLÍA CONTRATO] Proporción del lienzo, en los palacios que no son cuerpo. */
  aspect?: number;
  /** [AMPLÍA CONTRATO] Plano vectorial generado. */
  planData?: { svg: string; w: number; h: number };
  /** [AMPLÍA CONTRATO] Habitaciones del plano. */
  rooms?: Room[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: ID;
  palaceId: ID;
  name: string;
  color: string;
  order: number;
}

export interface Locus {
  id: ID;
  palaceId: ID;
  zoneId?: ID;
  routeNo: number;
  partName: string;
  side: 'front' | 'back';
  pos: { x: number; y: number };
  anchor?: { text: string; media?: string };
  notes?: string;
  /**
   * [AMPLÍA CONTRATO] El nombre de la parte en el idioma que se estudia, con
   * su transcripción: «Pelo» → «Hair /heər/». La parte del cuerpo también se
   * memoriza, así que acompaña al punto en todas las pantallas.
   */
  partNameEn?: string;
  partIpa?: string;
  /** [AMPLÍA CONTRATO] Punto agrupado (cabeza, manos): se dibuja más pequeño. */
  dense?: boolean;
  /** [AMPLÍA CONTRATO] Nombre de la habitación, en palacios `custom_plan`. */
  room?: string;
}

export interface SceneObject {
  id: ID;
  locusId: ID;
  text: string;
  represents?: string;
  media?: string;
  order: number;
}

export type Block =
  | { type: 'text'; md: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][]; caption?: string }
  | { type: 'bilingual'; en: string; es: string; tag?: 'base' | 'cotidiano' | 'c1' }
  | { type: 'error'; wrong: string; right: string; why?: string }
  | { type: 'image'; src: string; alt: string }
  | { type: 'note'; md: string };

export interface Item {
  id: ID;
  locusId: ID | null;
  deckId?: ID;
  templateId: ID;
  title: string;
  front?: string;
  back?: string;
  blocks: Block[];
  tags: string[];
  fields: Record<string, unknown>;
  priority?: number;
  origin: 'manual' | 'import' | 'ai';
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: ID;
  name: string;
  description?: string;
  templateId?: ID;
  scheduleId?: ID;
}

/** Un campo declarado por una plantilla. El valor vive en `Item.fields`. */
export interface TemplateField {
  key: string;
  label: string;
  kind: 'text' | 'longtext' | 'number' | 'list' | 'table' | 'object';
  hint?: string;
}

export interface Template {
  id: ID;
  name: string;
  description?: string;
  fields: TemplateField[];
  /** Orden sugerido de los bloques al crear un ítem con esta plantilla. */
  blockOrder: Block['type'][];
}

export interface Interval {
  value: number;
  unit: Unit;
}

export interface Schedule {
  id: ID;
  name: string;
  mode: 'checkpoints' | 'adaptive';
  intervals: Interval[];
  rules: {
    againAction: 'reset' | 'back1' | 'back2';
    hardFactor: number;
    easySkip: number;
    minInterval: Interval;
    /** p. ej. 8 → los intervalos ≥ 1 d caen a esa hora local. */
    dayStartHour: number;
  };
}

export interface ReviewState {
  itemId: ID;
  scheduleId: ID;
  /** 0 = nuevo. */
  stage: number;
  dueAt: string | null;
  lastReviewedAt?: string;
  ease?: number;
  lapses: number;
  streak: number;
  suspended: boolean;
}

export interface ReviewLog {
  id: ID;
  itemId: ID;
  at: string;
  grade: Grade;
  stageBefore: number;
  stageAfter: number;
  intervalApplied: Interval | null;
  dueAt: string;
  manual: boolean;
  durationSec?: number;
}

/**
 * Paquete de importación / exportación, formato JSON v1 (contrato §5).
 * Todas las colecciones son opcionales: se permite el import parcial.
 * Los esquemas Zod que lo validan llegan en la Fase 3.
 */
export interface Bundle {
  version: 1;
  palaces?: Palace[];
  zones?: Zone[];
  loci?: Locus[];
  sceneObjects?: SceneObject[];
  items?: Item[];
  decks?: Deck[];
  templates?: Template[];
  schedules?: Schedule[];
}
