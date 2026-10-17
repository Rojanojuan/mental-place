/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Las variables de compilación. Las dos del push las pone el flujo de
 * despliegue; si faltan, la app simplemente no ofrece el aviso con la app
 * cerrada (ver `features/notifications/push.ts`).
 */
interface ImportMetaEnv {
  /** URL del Worker de avisos, p. ej. `https://palacio-avisos.tu.workers.dev`. */
  readonly VITE_PUSH_SERVER?: string;
  /** Clave pública VAPID, en base64 url-safe. No es secreta. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
