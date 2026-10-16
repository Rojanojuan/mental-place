import { exportBundle, getSetting, setSetting } from '@/db';
import { serializeBundle } from '@/io';

const KEY = 'autobackup';
const AT_KEY = 'autobackupAt';
/** Una copia al día es suficiente: el contenido cambia despacio. */
const EVERY_MS = 24 * 60 * 60 * 1000;
/** Cuántas copias se guardan antes de tirar la más vieja. */
const KEEP = 5;

export interface Backup {
  at: string;
  bytes: number;
  json: string;
}

/**
 * Copia de seguridad automática en el almacenamiento local de la base.
 *
 * No descarga nada sola —eso pediría permiso al navegador cada vez—: guarda las
 * últimas cinco copias dentro de la propia app, y desde «Datos» se puede bajar
 * la que haga falta. Si se borran los datos del sitio también se van, así que
 * **no sustituye** a bajarse una copia de vez en cuando.
 */
export async function runAutoBackup(now = new Date()): Promise<Backup | null> {
  const last = await getSetting<number>(AT_KEY, 0);
  if (now.getTime() - last < EVERY_MS) return null;

  const json = serializeBundle(await exportBundle());
  const backup: Backup = { at: now.toISOString(), bytes: json.length, json };
  const kept = await getSetting<Backup[]>(KEY, []);
  await setSetting(KEY, [backup, ...kept].slice(0, KEEP));
  await setSetting(AT_KEY, now.getTime());
  return backup;
}

/** Las copias guardadas, de la más reciente a la más antigua. */
export async function listBackups(): Promise<Omit<Backup, 'json'>[]> {
  const kept = await getSetting<Backup[]>(KEY, []);
  return kept.map(({ at, bytes }) => ({ at, bytes }));
}

export async function getBackup(at: string): Promise<Backup | undefined> {
  return (await getSetting<Backup[]>(KEY, [])).find((backup) => backup.at === at);
}
