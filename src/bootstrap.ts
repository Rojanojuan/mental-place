import seedUrl from '../seed/fonetica45.json?url';
import type { Bundle } from '@/domain/types';
import { type PalacioDB, db, ensurePresets, importBundle, isEmpty } from '@/db';
import { runAutoBackup } from '@/features/import-export/autobackup';
import { notifyDue } from '@/features/notifications/notify';

export interface BootstrapResult {
  seeded: boolean;
  items: number;
}

/**
 * Prepara la base de datos al arrancar: deja los presets de repaso y, **solo
 * si está vacía**, siembra el palacio de fonética.
 *
 * Nunca pisa el trabajo del usuario: en el segundo arranque no toca nada.
 * Cuando exista la pantalla de importación (Fase 3), sembrar será una acción
 * suya y esto se quedará solo con los presets.
 */
export async function bootstrap(database: PalacioDB = db): Promise<BootstrapResult> {
  await ensurePresets(database);
  if (!(await isEmpty(database))) return { seeded: false, items: await database.items.count() };

  const response = await fetch(seedUrl);
  if (!response.ok) throw new Error(`No se pudo leer la semilla (HTTP ${String(response.status)})`);
  const bundle = (await response.json()) as Bundle;
  const counts = await importBundle(bundle, database);
  return { seeded: true, items: counts.items };
}

/**
 * Tareas de cada arranque: copia automática y aviso de vencidos.
 *
 * Se llama también al volver del segundo plano, porque una PWA no puede
 * despertarse sola de forma fiable para avisar.
 */
export async function onAppOpen(): Promise<void> {
  await runAutoBackup();
  await notifyDue();
}
