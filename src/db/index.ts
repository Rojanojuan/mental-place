/**
 * Persistencia local en IndexedDB (Dexie). Esta capa sí puede llamar al motor
 * de repaso; el motor nunca llama aquí.
 */
export { PalacioDB, db } from './db';
export { newId, stamp } from './id';
export type { Setting } from './db';

export * from './repo';
export * from './review';
export {
  clearAll,
  ensurePresets,
  exportBundle,
  importBundle,
  isEmpty,
  seedIfEmpty,
} from './bundle';
export type { ImportCounts } from './bundle';
