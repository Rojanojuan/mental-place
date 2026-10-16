import { countsFor, getSetting, setSetting } from '@/db';

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
    icon: '/icon.svg',
  });
  await setSetting(LAST_KEY, now.getTime());
  return { sent: true };
}
