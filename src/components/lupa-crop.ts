import { BODY_VIEWBOX } from '@/design/assets';
import type { Locus } from '@/domain/types';

/**
 * Lupa: los puntos amontonados, separados.
 *
 * En el cuerpo de fonética 15 de los 45 puntos caen en la cabeza; sus áreas
 * táctiles se solapan y tocar uno concreto es cuestión de suerte. El diseño lo
 * resuelve con un círculo muy ampliado sobre esa zona, donde cada punto
 * recupera su número y su estado (`PalacioApp.dc.html`, D-088).
 *
 * El recorte **se calcula** a partir de los puntos marcados como densos: no
 * hay ninguna coordenada de la cabeza escrita en la app.
 */

/** Margen alrededor del grupo, en proporción a su tamaño. */
const MARGEN = 0.3;
/** Lado mínimo del recorte, para que dos puntos pegados no llenen el círculo. */
const LADO_MIN = BODY_VIEWBOX.width * 0.22;

export interface Recorte {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * El cuadrado que encierra los puntos densos de un lado, con margen.
 *
 * Devuelve `null` si no hay al menos dos: con uno solo no hay nada que
 * separar y la lupa sobra.
 */
export function recorteDenso(loci: Locus[], lado: 'front' | 'back'): Recorte | null {
  const densos = loci.filter((l) => l.dense === true && l.side === lado);
  if (densos.length < 2) return null;

  const xs = densos.map((l) => l.pos.x * BODY_VIEWBOX.width);
  const ys = densos.map((l) => l.pos.y * BODY_VIEWBOX.height);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  // Cuadrado: el círculo de la lupa no debe deformar el cuerpo.
  const ancho = Math.max(x1 - x0, y1 - y0, LADO_MIN);
  const lado2 = ancho * (1 + MARGEN * 2);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: cx - lado2 / 2, y: cy - lado2 / 2, w: lado2, h: lado2 };
}

/**
 * Diámetro de pin que **no** amontona.
 *
 * Agrandar los pines a ojo los hacía solaparse otra vez, que es justo lo que
 * la lupa viene a resolver. Aquí sale de la distancia real al vecino más
 * cercano: cada pin ocupa como mucho el 80 % de ese hueco. La mediana, y no el
 * mínimo, para que dos puntos casi pegados no encojan a todos los demás.
 */
export function diametroSinSolape(loci: Locus[], recorte: Recorte): number {
  const puntos = loci
    .map((l) => ({ x: l.pos.x * BODY_VIEWBOX.width, y: l.pos.y * BODY_VIEWBOX.height }))
    .filter(
      (p) =>
        p.x >= recorte.x &&
        p.x <= recorte.x + recorte.w &&
        p.y >= recorte.y &&
        p.y <= recorte.y + recorte.h,
    );

  const maximo = recorte.w * 0.11;
  if (puntos.length < 2) return maximo;

  const vecinos = puntos.map((a) => {
    let min = Infinity;
    for (const b of puntos) {
      if (a === b) continue;
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
    return min;
  });
  vecinos.sort((a, b) => a - b);
  const mediana = vecinos[Math.floor(vecinos.length / 2)] ?? maximo;

  // Un suelo: por debajo no se leería el número ni se podría tocar.
  return Math.min(maximo, Math.max(recorte.w * 0.045, mediana * 0.8));
}
