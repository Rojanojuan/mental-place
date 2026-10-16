/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  type PrecacheEntry,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { PERIODIC_TAG } from '@/features/notifications/periodic-tag';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

/** Nombre de la base de Dexie (ver `src/db/db.ts`). */
const DB_NAME = 'palacio-corporal';
const STORE = 'reviewStates';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// La app es de una sola página: cualquier navegación devuelve el index.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// `registerType: 'autoUpdate'`: la versión nueva entra sin preguntar.
self.addEventListener('install', () => {
  void self.skipWaiting();
});
clientsClaim();

/**
 * Cuántos repasos están vencidos, leyendo IndexedDB en crudo.
 *
 * Aquí no se usa Dexie a propósito: el service worker no debe arrastrar media
 * app para contar registros. `suspended` es booleano y IndexedDB no indexa
 * booleanos, así que se recorre el índice de fechas y se filtra a mano.
 */
async function countDue(now: Date): Promise<number> {
  return new Promise((resolve) => {
    const open = indexedDB.open(DB_NAME);
    open.onerror = () => {
      resolve(0);
    };
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.close();
        resolve(0);
        return;
      }
      const tx = database.transaction(STORE, 'readonly');
      const cursor = tx
        .objectStore(STORE)
        .index('dueAt')
        .openCursor(IDBKeyRange.upperBound(now.toISOString()));
      let due = 0;
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return;
        const row = current.value as { suspended?: boolean };
        if (row.suspended !== true) due += 1;
        current.continue();
      };
      tx.oncomplete = () => {
        database.close();
        resolve(due);
      };
      tx.onerror = () => {
        database.close();
        resolve(0);
      };
    };
  });
}

async function remind(): Promise<void> {
  const due = await countDue(new Date());
  if (due === 0) return;
  await self.registration.showNotification('Palacio Corporal', {
    body: due === 1 ? 'Tienes 1 repaso vencido.' : `Tienes ${String(due)} repasos vencidos.`,
    tag: 'palacio-due',
    icon: 'icon.svg',
    badge: 'icon.svg',
    data: { url: 'sesion' },
  });
}

/**
 * Aviso con la app cerrada.
 *
 * Lo dispara Chrome en Android y solo si la app está **instalada**: es la única
 * forma de avisar sin la app abierta y sin montar un servidor de push. Ver
 * docs/DECISIONES.md D-076.
 */
self.addEventListener('periodicsync', (event) => {
  const sync = event as ExtendableEvent & { tag?: string };
  if (sync.tag !== PERIODIC_TAG) return;
  sync.waitUntil(remind());
});

// Un `push` del servidor haría lo mismo, el día que haya servidor.
self.addEventListener('push', (event) => {
  event.waitUntil(remind());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? '';
  const target = new URL(url, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(target);
    }),
  );
});
