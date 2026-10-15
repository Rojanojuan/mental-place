// Tipos base del CONTRATO COMPARTIDO §2 (punto de partida de la Fase 0).
// La Fase 1 los amplía con Deck, Template y los campos añadidos en diseño
// (Palace.style / planData / rooms, Locus.room / dense, tipo `custom_plan`).

export type ID = string;
export type LocusState = 'empty' | 'new' | 'learning' | 'due' | 'review' | 'mastered' | 'suspended';
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type Unit = 'min' | 'h' | 'd' | 'w' | 'mo';

export interface Palace {
  id: ID;
  name: string;
  kind: 'body_front' | 'body_back' | 'body_both' | 'custom_image';
  imageRef?: string;
  color?: string;
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
