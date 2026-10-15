/**
 * Importación y exportación en el formato JSON v1 del contrato (§5).
 *
 * La frontera de confianza está en `schema.ts`: todo lo que entra se valida con
 * Zod antes de tocar la base de datos, y `planImport()` deja ver exactamente
 * qué va a cambiar antes de confirmar.
 */
export * from './schema';
export { resolveLocusRef } from './locus-ref';
export type { Catalog, RefResult } from './locus-ref';
export { COLLECTIONS, planImport, planTotal, readCatalog, readExistingIds } from './plan';
export type { Collection, CollectionDiff, ExistingIds, ImportPlan, UnresolvedRef } from './plan';
export { bundleToCsv, csvToBundle, guessSeparator, parseCsv, suggestMapping } from './csv';
export type { CsvImportOptions, CsvMapping, CsvTable } from './csv';
export { backupFilename, downloadBackup, downloadText, serializeBundle } from './download';
