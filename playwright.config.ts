import { defineConfig, devices } from '@playwright/test';

/**
 * E2E en el navegador de verdad. Arranca la app construida (`vite preview`)
 * para probar lo que de verdad se publica, service worker incluido.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // Un reintento: son pruebas en un navegador real y dependen de la carga de
  // la máquina. Cada test que ha fallado alguna vez pasa en solitario; lo que
  // se repite no es un fallo de la app sino una espera que no llegó.
  retries: 1,
  reporter: process.env.CI === undefined ? [['list']] : [['github'], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 5'] } },
    // Safari en iOS no es Chrome con otra piel: el desborde que recortaba el
    // texto por la derecha solo se vio aqui. Los tests de telefono miran el
    // prefijo «movil», asi que corren en los dos. Necesita
    // `npx playwright install webkit`.
    { name: 'movil-iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    // `--host 127.0.0.1`: sin él vite preview escucha en localhost y Playwright
    // sondea 127.0.0.1, así que se queda esperando hasta agotar el tiempo.
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: process.env.CI === undefined,
    timeout: 180_000,
  },
});
