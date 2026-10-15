# Progreso

## Fase 0 · Andamiaje — ✅ terminada (2026-10-15)

### Hecho

- **Proyecto**: React 18 + TypeScript + Vite 8, PWA con `vite-plugin-pwa` (`autoUpdate`,
  manifiesto en español, service worker generado en `dist/sw.js`).
- **TypeScript estricto**: `strict` + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitReturns`, `verbatimModuleSyntax`. Alias `@/*` → `src/*` en TS y en Vite.
- **Calidad**: ESLint 10 (flat config) con `strictTypeChecked` + `stylisticTypeChecked`,
  react-hooks, react-refresh y Prettier. Regla que impide que `src/srs` y `src/domain` importen
  persistencia o UI (ver D-007).
- **Tests**: Vitest + jsdom + Testing Library, `tests/setup.ts`, 2 tests de humo verdes. Umbrales
  de cobertura ≥ 90 % apuntados a `src/srs`, `src/domain` e `src/io`.
- **Carpetas** del contrato §4 creadas, incluidas las 11 de `src/features/`.
- **Diseño real integrado** (D-001): `src/design/tokens.css`, `body-front.svg`, `body-back.svg`
  copiados del traspaso. `src/design/assets.ts` expone el viewBox `200×480` y las dos siluetas;
  `src/design/states.ts` mapea los 7 estados del contrato a su token CSS y su etiqueta en español.
- **Dominio**: `src/domain/types.ts` verbatim del contrato §5 (ver D-004).
- **Docs**: `CLAUDE.md` (instrucciones + contrato), `docs/DECISIONES.md` (8 decisiones),
  `docs/HANDOFF_DISENO.md` (inventario de componentes y props), este archivo.
- **Pantalla de verificación** provisional (`src/App.tsx`): los 7 estados con su color y las dos
  siluetas, con interruptor de tema claro/oscuro. La Fase 4 la sustituye.

### Comprobaciones

| Comando             | Resultado                                                  |
| ------------------- | ---------------------------------------------------------- |
| `npm run typecheck` | ✅ sin errores                                             |
| `npm run lint`      | ✅ sin errores ni avisos                                   |
| `npm test`          | ✅ 2/2                                                     |
| `npm run build`     | ✅ 221 kB JS (69 kB gzip), SW con 11 entradas precacheadas |

### Demo manual (4 pasos)

1. `npm run dev` y abre la URL que imprime (por defecto `http://localhost:5173`).
2. Comprueba que se ven los 7 estados del contrato, cada uno con su color semántico, y las dos
   siluetas (frontal y posterior) con el hueco del 22 % entre ellas.
3. Pulsa **Tema: oscuro** → pasa a claro; todos los colores cambian sin recargar (los tokens del
   diseño responden a `data-pc-theme` en `<html>`).
4. `npm run build && npm run preview` → en DevTools › Application se ve el manifiesto «Palacio
   Corporal» y el service worker activo (instalable como PWA).

### Pendiente (siguiente: Fase 1)

- `src/domain/`: `Deck`, `Template`, y los campos de diseño `Palace.style` / `planData` / `rooms` /
  `aspect`, `Locus.room` / `dense`, tipo `custom_plan`.
- `src/srs/`: `PRESETS`, `grade()`, `override()`, `previewIntervals()`, `itemStatus()`,
  `locusStatus()`, `buildQueue()` y la batería de tests obligatorios de `CLAUDE.md` §6.
- Las carpetas `src/db/`, `src/io/`, `src/providers/`, `src/state/`, `src/components/` y
  `src/features/*` están vacías a propósito (marcador `.gitkeep`).

### Esperando del usuario (no bloquea)

- **`elementos_c1_base.json`** — la Fase 3 debe convertirlo en `seed/gramatica_c1.json` (ítems de
  la plantilla «Gramática C1», asignados por su campo `palacio`). No está en el repositorio.
  Hasta que llegue, la Fase 3 se hará contra un archivo de ejemplo reducido.
- Confirmación de que **`dexie-react-hooks`** puede quedarse en el stack (D-005).
