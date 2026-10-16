# Palacio Corporal

Palacio de la memoria sobre un cuerpo humano personalizable (o un plano de casa, o una imagen
propia), con repaso espaciado por checkpoints y fijación manual del próximo repaso. PWA
offline-first para móvil y escritorio, en español.

## Puesta en marcha

```bash
npm install
npm run dev
```

## Comandos

| Comando                 | Qué hace                                               |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo.                                |
| `npm run build`         | Typecheck + bundle de producción + service worker.     |
| `npm run preview`       | Sirve `dist/` (para probar la PWA instalada).          |
| `npm test`              | Vitest una pasada.                                     |
| `npm run test:cov`      | Cobertura (umbral ≥ 90 % en `src/srs`, `src/domain`).  |
| `npm run lint`          | ESLint.                                                |
| `npm run format`        | Prettier.                                              |
| `npm run check`         | typecheck + lint + tests. Es la puerta de cada fase.   |
| `npm run e2e`           | 42 e2e con Playwright en Chromium, escritorio y móvil. |
| `npm run seed:fonetica` | Regenera `seed/fonetica45.json` desde el Word.         |

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
