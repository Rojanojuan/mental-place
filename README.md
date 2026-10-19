# Palacio Corporal

Palacio de la memoria sobre un cuerpo humano personalizable (o un plano de casa, o una imagen
propia), con repaso espaciado por checkpoints y fijación manual del próximo repaso. PWA
offline-first para móvil y escritorio, en español.

## Puesta en marcha

```bash
npm install
npm run dev
```

Para los e2e hace falta además el navegador de Safari:

```bash
npx playwright install webkit
```

No es un capricho: el desborde que recortaba el texto por la derecha en un iPhone **solo** se veía
en WebKit (`docs/DECISIONES.md` D-086).

## Comandos

| Comando                 | Qué hace                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo.                                      |
| `npm run build`         | Typecheck + bundle de producción + service worker.           |
| `npm run preview`       | Sirve `dist/` (para probar la PWA instalada).                |
| `npm test`              | Vitest una pasada.                                           |
| `npm run test:cov`      | Cobertura (umbral ≥ 90 % en `src/srs`, `src/domain`).        |
| `npm run lint`          | ESLint.                                                      |
| `npm run format`        | Prettier.                                                    |
| `npm run check`         | typecheck + lint + tests. Es la puerta de cada fase.         |
| `npm run e2e`           | E2E en escritorio, Android (Chromium) e **iPhone (WebKit)**. |
| `npm run seed:fonetica` | Regenera `seed/fonetica45.json` desde el Word.               |

## Publicar

La app se publica en **GitHub Pages** desde `.github/workflows/deploy.yml`: cada empujón a `main`
pasa `npm run check`, compila con `BASE_PATH=/mental-place/` y sube `dist/`. Queda en

```
https://<tu-usuario>.github.io/mental-place/
```

La primera vez, en el repositorio: **Settings → Pages → Source: GitHub Actions**.

Para compilar en local como lo hace el despliegue:

```powershell
$env:BASE_PATH = '/mental-place/'; npm run build; $env:BASE_PATH = $null
```

Sin esa variable la base es `/`, que es lo que necesitan `npm run preview` y los e2e.

### Avisos de repaso

Cuatro caminos, y la pantalla **Datos** dice cuál está activo. En iPhone importa cuál, porque
`periodicsync` no existe en iOS (`docs/DECISIONES.md` D-091):

| Camino            | Cuándo avisa                       | Qué necesita                      |
| ----------------- | ---------------------------------- | --------------------------------- |
| Al abrir la app   | al arrancar y al volver            | nada                              |
| Temporizador      | en el minuto exacto, app abierta   | nada                              |
| Calendario (.ics) | hora exacta, app cerrada           | exportar desde «Datos»            |
| `periodicsync`    | cada ~12 h, lo decide el navegador | Chrome/Edge + app instalada       |
| **Web Push**      | hora exacta, app cerrada           | el Worker de `worker/` desplegado |

El Web Push es lo único que avisa a la hora exacta con la app cerrada en un iPhone, y necesita un
servidor porque Pages es estático. Puesta en marcha: **`docs/AVISOS_PUSH.md`** (10 minutos, 0 €).
El servidor solo guarda marcas de tiempo: lo que estudias no sale del teléfono (D-092).

## Mapa del repositorio

- `CLAUDE.md` — instrucciones del proyecto y **contrato compartido** (fuente única de verdad).
- `src/domain/` — entidades del contrato, sin dependencias.
- `src/srs/` — motor de repaso **puro** (sin I/O), con cobertura ≥ 90 %.
- `src/db/` — Dexie: esquema, migraciones, repositorios.
- `src/io/` — import/export JSON y CSV, validado con Zod.
- `src/design/` — tokens y siluetas del traspaso de diseño.
- `src/features/`, `src/components/` — pantallas y componentes de presentación.
- `seed/` — datos de ejemplo (ver `seed/README.md`).
- `docs/` — decisiones, progreso y handoff de diseño.
- `design_handoff_palacio_corporal/` — prototipos de diseño, **solo lectura**.

## Pantallas

| Ruta            | Pantalla                                                                       |
| --------------- | ------------------------------------------------------------------------------ |
| `/`             | **Hoy** — vencidos, nuevos, racha, previsión de 7 días, mapa                   |
| `/sesion`       | **Sesión** — señalar → escena → contenido → calificar → hoja de próximo repaso |
| `/inspector`    | **Palacio** — recorrer los puntos y revisar su contenido                       |
| `/editor`       | **Editor** — crear y mover puntos, zonas, ruta                                 |
| `/punto/:id`    | **Detalle del punto** — ancla, objetos de escena, ítems, historial             |
| `/item/:id`     | **Editor de ítem** — bloques, asignación, vista previa                         |
| `/biblioteca`   | **Biblioteca** — filtros, lote, bandeja «Sin asignar»                          |
| `/estadisticas` | **Progreso** — previsión de 30 días, retención, cuerpo de calor                |
| `/horarios`     | **Horarios** — presets, intervalos con sus fechas, reglas                      |
| `/datos`        | **Datos** — importar/exportar, copias, avisos                                  |
| `/bienvenida`   | **Onboarding** — cuatro pasos                                                  |

Atajos de teclado en la sesión: **espacio** revela, **1–4** califican.

## Estado

Fases 0 a 6 terminadas, con el palacio de fonética cargado de fábrica.
**455 tests unitarios y 46 e2e** en escritorio y móvil.

Los diez planos de casa están en `seed/casas.json` (1 363 puntos): no se cargan solos, se importan
desde «Datos» cuando los quieras. Ver `docs/PROGRESO.md`.
