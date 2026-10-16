import bodyFrontUrl from './body-front.svg';
import bodyBackUrl from './body-back.svg';
import bodyFrontRaw from './body-front.svg?raw';
import bodyBackRaw from './body-back.svg?raw';

// Siluetas del traspaso de diseño. viewBox 0 0 200 480:
// la posición de un locus es {x: px / 200, y: py / 480} en 0–1.
export const BODY_VIEWBOX = { width: 200, height: 480 } as const;

/** Las capas que trae el SVG, de fuera adentro. */
export type BodyLayer = 'ears' | 'outline' | 'face' | 'joints' | 'muscles';

/**
 * Deja el contenido del SVG listo para incrustarlo dentro de otro `<svg>`.
 *
 * Incrustar, en vez de usar `<image>`, es lo único que permite que la
 * apariencia del palacio (`Palace.style`) llegue a las capas con CSS.
 *
 * Por el camino:
 * - quita la metadata C2PA, que son 7,7 kB de los 13 kB del archivo;
 * - cambia los `id` por clases, porque los dos cuerpos conviven en el mismo
 *   documento y dos `id="outline"` serían inválidos.
 */
function inner(raw: string): string {
  return raw
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\sid="(ears|outline|face|joints|muscles)"/g, ' class="body__$1"');
}

/** El dibujo, sin el `<svg>` de fuera, para incrustarlo en el mapa. */
export const BODY_INNER: Record<'front' | 'back', string> = {
  front: inner(bodyFrontRaw),
  back: inner(bodyBackRaw),
};

/** La silueta como archivo, para donde haga falta una imagen suelta. */
export const BODY_SILHOUETTE: Record<'front' | 'back', string> = {
  front: bodyFrontUrl,
  back: bodyBackUrl,
};
