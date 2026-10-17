import { nextDueAfter } from '@/db';
import { notifyEnabled } from './notify';

/**
 * El aviso del próximo repaso, en su minuto exacto.
 *
 * Es la pieza que faltaba para «avísame cuando toque», y la única que da la
 * hora exacta sin servidor: mientras la app siga viva —abierta o en una
 * pestaña de fondo— se arma un temporizador para el siguiente vencimiento y
 * salta ahí, no «en algún momento».
 *
 * Cubre de verdad los checkpoints cortos del preset R10 (10 min, 1 h), que son
 * los que se pierden si solo se mira al abrir la app. Para los de días hace
 * falta el calendario o un push desde un servidor (D-091).
 *
 * `setTimeout` no admite más de ~24,8 días, y uno largo además se desviaría al
 * suspenderse el equipo: por eso se trocea y se vuelve a comprobar.
 */

/** Tope de un tramo. Pasado ese rato se recalcula, por si el reloj saltó. */
const TRAMO_MAX_MS = 10 * 60 * 1000;

export interface Programado {
  /** Cuándo saltará, o `null` si no hay nada pendiente. */
  at: Date | null;
  /** Deja de vigilar. */
  cancel: () => void;
}

function textoDe(punto: string | undefined, cuantos: number): string {
  if (cuantos > 1) {
    return punto === undefined
      ? `Toca repasar ${String(cuantos)} ítems.`
      : `Toca repasar: ${punto} y ${String(cuantos - 1)} más.`;
  }
  return punto === undefined ? 'Toca repasar.' : `Toca repasar: ${punto}`;
}

/** Muestra el aviso. Separado para poder probarlo sin temporizadores. */
export async function avisarAhora(now = new Date()): Promise<boolean> {
  if (!(await notifyEnabled())) return false;
  const proximo = await nextDueAfter(new Date(now.getTime() - 1000));
  // Si ya no vence nada en este instante, no se inventa un aviso.
  if (proximo === null || proximo.at.getTime() > now.getTime() + 1000) return false;

  new Notification('Palacio Corporal', {
    body: textoDe(proximo.punto, proximo.cuantos),
    tag: 'palacio-proximo',
    icon: `${import.meta.env.BASE_URL}icon.svg`,
  });
  return true;
}

/**
 * Programa el aviso del próximo repaso y se vuelve a armar solo.
 *
 * Hay que llamarlo otra vez tras calificar: la cola cambia y el próximo
 * vencimiento ya no es el mismo.
 */
export function scheduleNextDue(
  onFire: (now: Date) => unknown = avisarAhora,
  now: () => Date = () => new Date(),
): Programado {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ctl = { vivo: true };
  const estado: Programado = {
    at: null,
    cancel: () => {
      ctl.vivo = false;
      if (timer !== undefined) clearTimeout(timer);
    },
  };

  const armar = (): void => {
    if (!ctl.vivo) return;
    void (async () => {
      const ahora = now();
      const proximo = await nextDueAfter(ahora);
      if (!ctl.vivo) return;
      if (proximo === null) {
        estado.at = null;
        // Nada pendiente: se vuelve a mirar dentro de un rato por si el
        // usuario añade contenido en otra pestaña.
        timer = setTimeout(armar, TRAMO_MAX_MS);
        return;
      }

      estado.at = proximo.at;
      const falta = proximo.at.getTime() - ahora.getTime();
      if (falta <= 0) {
        void onFire(ahora);
        timer = setTimeout(armar, 1000);
        return;
      }
      timer = setTimeout(armar, Math.min(falta, TRAMO_MAX_MS));
    })();
  };

  armar();
  return estado;
}
