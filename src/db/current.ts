import type { ID, Palace } from '@/domain/types';
import { type PalacioDB, db } from './db';
import { getSetting, listPalaces, setSetting } from './repo';

const KEY = 'currentPalaceId';

/**
 * El palacio con el que se está trabajando.
 *
 * Se guarda en `settings` para que todas las pantallas coincidan y la elección
 * sobreviva a recargar. Si el guardado ya no existe —se borró, o nunca se
 * eligió— cae al primero por orden.
 */
export async function getCurrentPalace(database: PalacioDB = db): Promise<Palace | undefined> {
  const palaces = await listPalaces(database);
  if (palaces.length === 0) return undefined;
  const id = await getSetting<ID | null>(KEY, null, database);
  return palaces.find((palace) => palace.id === id) ?? palaces[0];
}

export async function setCurrentPalace(id: ID, database: PalacioDB = db): Promise<void> {
  await setSetting(KEY, id, database);
}
