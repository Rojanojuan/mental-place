// IndexedDB en memoria: jsdom no la trae y Dexie la necesita al importarse,
// así que el polyfill va aquí, en el setup global, antes que cualquier módulo.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom no implementa `matchMedia` ni `scrollIntoView`, y las pantallas los
 * usan para decidir si estan en una sola columna y traer el panel a la vista.
 * El doble resuelve `min-width`/`max-width` contra `window.innerWidth`, de modo
 * que un test puede simular un telefono cambiando ese valor.
 */
if (typeof window !== 'undefined') {
  window.matchMedia = (query: string): MediaQueryList => {
    const min = /\(min-width:\s*(\d+)px\)/.exec(query);
    const max = /\(max-width:\s*(\d+)px\)/.exec(query);
    // Una consulta que no sea de ancho (p. ej. `prefers-reduced-motion`) no
    // se simula: en los tests vale el comportamiento por defecto.
    const anchura = min !== null || max !== null;
    const cumpleMin = min === null || window.innerWidth >= Number(min[1]);
    const cumpleMax = max === null || window.innerWidth <= Number(max[1]);
    return {
      matches: anchura && cumpleMin && cumpleMax,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    };
  };
  // Solo tiene que existir: los tests comprueban que se llama.
  Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
    return undefined;
  };
}

afterEach(() => {
  cleanup();
});
