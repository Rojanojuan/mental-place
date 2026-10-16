/**
 * La etiqueta del aviso en segundo plano.
 *
 * Vive en su propio módulo porque la comparten dos mundos que no se pueden
 * importar entre sí: la app (`notify.ts`) la registra y el service worker
 * (`src/sw.ts`) la escucha. Si se separan, el aviso deja de llegar en silencio.
 */
export const PERIODIC_TAG = 'repasos-vencidos';

/** Cada doce horas. El navegador decide cuándo de verdad; esto es una petición. */
export const PERIODIC_MIN_MS = 12 * 60 * 60 * 1000;
