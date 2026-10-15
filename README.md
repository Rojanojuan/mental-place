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

| Comando            | Qué hace                                              |
| ------------------ | ----------------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo.                               |
| `npm run build`    | Typecheck + bundle de producción + service worker.    |
| `npm run preview`  | Sirve `dist/` (para probar la PWA instalada).         |
| `npm test`         | Vitest una pasada.                                    |
| `npm run test:cov` | Cobertura (umbral ≥ 90 % en `src/srs`, `src/domain`). |
| `npm run lint`     | ESLint.                                               |
| `npm run format`   | Prettier.                                             |
| `npm run check`    | typecheck + lint + tests. Es la puerta de cada fase.  |

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

## Estado

Fase 0 (andamiaje) terminada. Ver `docs/PROGRESO.md`.
