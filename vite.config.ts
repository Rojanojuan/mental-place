import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Carpeta en la que vive la app publicada.
 *
 * En local es la raiz; GitHub Pages la sirve bajo `/<repositorio>/`, asi que el
 * flujo de despliegue exporta `BASE_PATH=/mental-place/`. Todo lo que arma una
 * ruta usa `import.meta.env.BASE_URL`, nunca `/` a pelo.
 */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // Service worker propio (`src/sw.ts`): el generado no puede avisar de los
      // repasos vencidos con la app cerrada. Ver docs/DECISIONES.md D-076.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Palacio Corporal',
        short_name: 'Palacio',
        description: 'Palacio de la memoria sobre un cuerpo personalizable con repaso espaciado.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#161826',
        theme_color: '#161826',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        // La semilla de fonetica pesa 693 kB y el precache la necesita entera
        // para que la app funcione sin red en el primer arranque.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // Sin esto, cada informe de cobertura recarga la página en desarrollo.
      ignored: ['**/coverage/**', '**/dist/**', '**/dev-dist/**'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Zona fija: el motor de repaso ancla los intervalos de un día o más a la
    // hora local, y los tests de cambio de horario necesitan una zona con DST.
    env: { TZ: 'Europe/Madrid' },
    // Varios tests importan semillas de ~1 MB en IndexedDB; el límite de 5 s
    // por defecto se quedaba corto y la suite salía intermitente.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Con un proceso por archivo la máquina se satura y las consultas en vivo
    // de Dexie tardan de más: la suite salía intermitente. Cuatro va sobrado.
    maxWorkers: 4,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/srs/**', 'src/domain/**', 'src/io/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
