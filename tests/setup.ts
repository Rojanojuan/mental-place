// IndexedDB en memoria: jsdom no la trae y Dexie la necesita al importarse,
// así que el polyfill va aquí, en el setup global, antes que cualquier módulo.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
