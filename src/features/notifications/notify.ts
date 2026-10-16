import { countsFor, getSetting, setSetting } from '@/db';
import { PERIODIC_MIN_MS, PERIODIC_TAG } from './periodic-tag';

export const NOTIFY_KEY = 'notifyEnabled';
const LAST_KEY = 'notifyLastAt';
/** Como mínimo cuatro horas entre avisos: nadie quiere una app que insista. */
const QUIET_MS = 4 * 60 * 60 * 1000;

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function notifyPermission(): NotifyPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Pide permiso. Solo se llama desde un gesto del usuario, nunca al arrancar. */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  const result = await Notification.requestPermission();
  await setSetting(NOTIFY_KEY, result === 'granted');
  return result;
}

export async function notifyEnabled(): Promise<boolean> {
  return (await getSetting(NOTIFY_KEY, false)) && notifyPermission() === 'granted';
}

export interface NotifyResult {
  sent: boolean;
  reason?: 'disabled' | 'nothing-due' | 'too-soon';
}

/**
 * Avisa de los repasos vencidos, si hay y si toca.
 *
 * Se llama al abrir la app y cuando vuelve del segundo plano; no hay tareas en
 * segundo plano porque una PWA no puede despertarse sola de forma fiable.
 */
export async function notifyDue(now = new Date()): Promise<NotifyResult> {
  if (!(await notifyEnabled())) return { sent: false, reason: 'disabled' };

  const last = await getSetting<number>(LAST_KEY, 0);
  if (now.getTime() - last < QUIET_MS) return { sent: false, reason: 'too-soon' };

  const counts = await countsFor({ scope: 'today' }, now);
  if (counts.due === 0) return { sent: false, reason: 'nothing-due' };

  const body =
    counts.due === 1
      ? 'Tienes 1 repaso vencido.'
      : `Tienes ${String(counts.due)} repasos vencidos.`;
  new Notification('Palacio Corporal', {
    body,
    tag: 'palacio-due',
    icon: `${import.meta.env.BASE_URL}icon.svg`,
  });
  await setSetting(LAST_KEY, now.getTime());
  return { sent: true };
}

/**
 * El permiso de «sincronizacion periodica en segundo plano» no esta en los
 * tipos del DOM todavia, asi que se declara lo poco que se usa.
 */
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

function periodicSync(registration: ServiceWorkerRegistration): PeriodicSyncManager | undefined {
  return (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager })
    .periodicSync;
}

export type PeriodicState =
  /** El navegador no tiene la API: solo Chrome/Edge la implementan. */
  | 'unsupported'
  /** La hay, pero falta instalar la app o el navegador la deniega. */
  | 'blocked'
  | 'off'
  | 'on';

async function manager(): Promise<PeriodicSyncManager | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? periodicSync(registration) : undefined;
}

/**
 * Si el aviso con la app cerrada esta activo.
 *
 * Chrome solo concede el permiso a una app **instalada** y con «engagement»
 * suficiente, de modo que `blocked` es el estado normal en el navegador: no es
 * un error que haya que arreglar, es que ahi no toca. Ver D-076.
 */
export async function periodicReminderState(): Promise<PeriodicState> {
  const sync = await manager();
  if (!sync) return 'unsupported';
  try {
    const tags = await sync.getTags();
    if (tags.includes(PERIODIC_TAG)) return 'on';
  } catch {
    return 'blocked';
  }
  return 'off';
}

/** Pide el aviso en segundo plano. Solo desde un gesto del usuario. */
export async function enablePeriodicReminder(): Promise<PeriodicState> {
  const sync = await manager();
  if (!sync) return 'unsupported';
  try {
    await sync.register(PERIODIC_TAG, { minInterval: PERIODIC_MIN_MS });
  } catch {
    return 'blocked';
  }
  return 'on';
}

export async function disablePeriodicReminder(): Promise<PeriodicState> {
  const sync = await manager();
  if (!sync) return 'unsupported';
  try {
    await sync.unregister(PERIODIC_TAG);
  } catch {
    return 'blocked';
  }
  return 'off';
}
