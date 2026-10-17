import { getSetting, proximosRepasos, setSetting } from '@/db';

/**
 * Web Push: el aviso que llega con la app cerrada.
 *
 * En un iPhone es la única forma de que suene a la hora exacta sin tener la
 * app abierta (D-091). El servidor es un Worker de Cloudflare que solo guarda
 * **marcas de tiempo**: el push llega vacío y es el service worker de aquí
 * quien cuenta los vencidos y escribe el aviso, así que lo que estudias no
 * sale del teléfono (D-092).
 */

export const PUSH_KEY = 'pushEndpoint';

/** A dónde se habla. Vacío = sin servidor configurado, y entonces no se ofrece. */
const SERVIDOR = import.meta.env.VITE_PUSH_SERVER ?? '';
const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
/** Cuántos repasos por delante se anuncian; el resto, al siguiente arranque. */
const HORIZONTE_DIAS = 45;
/**
 * Descanso entre envíos al servidor.
 *
 * Se llama al calificar, y una sesión larga son decenas de tarjetas. Cada
 * envío es una escritura en KV, y de esas el plan gratuito da 1 000 al día:
 * sin este descanso, una sesión de 200 tarjetas se come la quinta parte de la
 * cuota para decir casi lo mismo (D-093).
 */
const DESCANSO_MS = 60_000;

let ultimoEnvio = 0;

export type PushState =
  /** El navegador no lo trae, o no hay servidor configurado. */
  | 'unsupported'
  /** Hay que instalar la app en la pantalla de inicio (iPhone). */
  | 'needs-install'
  | 'off'
  | 'on';

/** La clave pública viaja en base64 «url-safe»; `subscribe` la quiere en bytes. */
export function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const limpio = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(limpio);
  // Con un `ArrayBuffer` explícito: `applicationServerKey` no acepta un
  // `Uint8Array` que pudiera estar respaldado por memoria compartida.
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Si hay servidor y el navegador sabe de push. */
export function pushDisponible(): boolean {
  return (
    SERVIDOR !== '' &&
    CLAVE_PUBLICA !== '' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined'
  );
}

/**
 * En iOS, `pushManager` solo existe en una app **instalada** en la pantalla de
 * inicio; en una pestaña de Safari no está. Merece su propio estado, porque la
 * solución es instalarla, no rendirse.
 */
function esStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export async function pushState(): Promise<PushState> {
  if (!pushDisponible()) return 'unsupported';
  if (!esStandalone()) return 'needs-install';
  const registro = await navigator.serviceWorker.getRegistration();
  const sub = await registro?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** Las fechas de los próximos repasos, en milisegundos. Es todo lo que se envía. */
export async function fechasPendientes(now = new Date()): Promise<number[]> {
  const proximos = await proximosRepasos(now, HORIZONTE_DIAS);
  return proximos.map((r) => r.at.getTime());
}

/**
 * Pone al día lo que el servidor sabe: la suscripción y cuándo avisar.
 *
 * Se llama al activarlo y **cada vez que cambia la cola** (al calificar), que
 * es cuando las fechas dejan de ser las que el servidor tenía.
 */
export async function syncPush(now = new Date(), forzar = false): Promise<boolean> {
  if (!pushDisponible()) return false;
  if (!forzar && now.getTime() - ultimoEnvio < DESCANSO_MS) return false;
  const registro = await navigator.serviceWorker.getRegistration();
  const subscription = await registro?.pushManager.getSubscription();
  if (!subscription) return false;

  const dueAts = await fechasPendientes(now);
  ultimoEnvio = now.getTime();
  const respuesta = await fetch(`${SERVIDOR}/suscribir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, dueAts }),
  });
  return respuesta.ok;
}

/** Se suscribe y manda las fechas. Solo desde un gesto del usuario. */
export async function enablePush(now = new Date()): Promise<PushState> {
  if (!pushDisponible()) return 'unsupported';
  if (!esStandalone()) return 'needs-install';

  const registro = await navigator.serviceWorker.ready;
  const existente = await registro.pushManager.getSubscription();
  const subscription =
    existente ??
    (await registro.pushManager.subscribe({
      // Obligatorio: un push que no enseña nada no está permitido.
      userVisibleOnly: true,
      applicationServerKey: claveABytes(CLAVE_PUBLICA),
    }));

  await setSetting(PUSH_KEY, subscription.endpoint);
  // Al activarlo sí se fuerza: es lo que el usuario acaba de pedir.
  await syncPush(now, true);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (!pushDisponible()) return 'unsupported';
  const registro = await navigator.serviceWorker.getRegistration();
  const subscription = await registro?.pushManager.getSubscription();
  if (subscription) {
    // Primero el servidor: si se cancela antes, se queda hablando solo.
    await fetch(`${SERVIDOR}/suscribir`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe();
  }
  await setSetting(PUSH_KEY, '');
  return 'off';
}

/** Si quedó una suscripción de una sesión anterior. */
export async function pushRecordado(): Promise<boolean> {
  return (await getSetting(PUSH_KEY, '')) !== '';
}
