/** Ancho a partir del cual las pantallas se abren en dos columnas. */
const DOS_COLUMNAS = '(min-width: 901px)';

function media(query: string): boolean | undefined {
  // jsdom no trae `matchMedia`, y su ausencia no debe romper la pantalla
  // (misma lección que D-069 con `setPointerCapture`).
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  return window.matchMedia(query).matches;
}

/**
 * Trae un panel a la vista cuando la pantalla va en una sola columna.
 *
 * En el teléfono el panel de detalle nace por debajo del borde inferior, así
 * que elegir un punto no tenía ningún efecto visible: el usuario tocaba y no
 * pasaba nada. En escritorio no hace nada, porque el detalle ya está al lado.
 */
export function revealPanel(el: HTMLElement | null): void {
  if (!el) return;
  if (media(DOS_COLUMNAS) === true) return;
  if (typeof el.scrollIntoView !== 'function') return;
  el.scrollIntoView({
    behavior: media('(prefers-reduced-motion: reduce)') === true ? 'auto' : 'smooth',
    block: 'start',
  });
}
