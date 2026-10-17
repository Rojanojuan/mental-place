import seedUrl from '../seed/fonetica45.json?url';
import type { Bundle } from '@/domain/types';
import { type PalacioDB, db, ensurePresets, importBundle, isEmpty } from '@/db';
import { runAutoBackup } from '@/features/import-export/autobackup';
import { notifyDue } from '@/features/notifications/notify';
import { syncPush } from '@/features/notifications/push';
import { scheduleNextDue } from '@/features/notifications/timer';

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

/** El temporizador en marcha, para rearmarlo cuando la cola cambie. */
let programado: { cancel: () => void } | null = null;

/**
 * Rearma el aviso del próximo repaso.
 *
 * Hay que llamarlo **después de calificar**: al cambiar la cola, el siguiente
 * vencimiento ya no es el mismo.
 */
export function rearmarAviso(): void {
  programado?.cancel();
  programado = scheduleNextDue();
  // Y el servidor de push, que tenía las fechas viejas. Si no hay servidor
  // configurado no hace nada.
  void syncPush().catch(() => undefined);
}

/**
 * Tareas de cada arranque: copia automática, aviso de lo vencido y el
 * temporizador del próximo repaso.
 *
 * Se llama también al volver del segundo plano. El temporizador solo vive
 * mientras la app esté abierta; con la app cerrada avisan el calendario
 * exportado o, en Android instalado, `periodicsync` (D-091).
 */
export async function onAppOpen(): Promise<void> {
  await runAutoBackup();
  await notifyDue();
  rearmarAviso();
}
