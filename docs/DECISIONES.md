# Decisiones

Registro de lo que el contrato no definía y se resolvió eligiendo la opción más simple.
Formato: fecha · decisión · motivo.

## Fase 0 — Andamiaje (2026-10-15)

### D-001 · Tokens y siluetas reales desde el primer día, no provisionales

El prompt original pedía tokens y una silueta **provisionales** porque el diseño iba en paralelo.
Pero `design_handoff_palacio_corporal/` ya está entregado y marcado como **alta fidelidad**, así que
se copiaron los archivos reales:

| Origen (solo lectura)    | Destino                     |
| ------------------------ | --------------------------- |
| `pc-tokens.css`          | `src/design/tokens.css`     |
| `silueta/body-front.svg` | `src/design/body-front.svg` |
| `silueta/body-back.svg`  | `src/design/body-back.svg`  |

**Motivo:** evita una reescritura de pieles en la Fase 5 y los nombres de token coinciden ya con el
contrato (`--state-due`, `--zone-torso`, …). El handoff queda intacto como referencia.

**Consecuencia:** la Fase 5 ya no es «integración del diseño» sino «cierre del diseño» (repaso
pantalla por pantalla + e2e). Ver `CLAUDE.md` §7.

### D-002 · Tema por atributo `data-pc-theme` en `<html>`

Los tokens del diseño se declaran bajo `[data-pc-theme="dark"|"light"]`, así que el tema se cambia
poniendo ese atributo en el elemento raíz (ya en `index.html`, por defecto `dark`).
**Motivo:** es el contrato del archivo de tokens; no se inventa otro mecanismo.

### D-003 · Iconos PWA en SVG

El manifiesto declara `icon.svg` e `icon-maskable.svg` en vez de PNG de 192/512 px.
**Motivo:** no hay pipeline de imágenes en el proyecto y los navegadores modernos aceptan SVG.
**Pendiente:** si hace falta soporte iOS completo, generar los PNG en la Fase 6.

### D-004 · `src/domain/types.ts` escrito en la Fase 0

El prompt lo da como «punto de partida», así que se escribió verbatim ya en el andamiaje, sin
ampliarlo. Los campos añadidos en diseño (`Palace.style`, `Locus.dense`, …) y las entidades `Deck`
y `Template` entran en la Fase 1.
**Motivo:** `src/design/states.ts` necesita `LocusState` para mapear estado → token.

### D-005 · `dexie-react-hooks` incluido en el stack

Añadido junto a Dexie (es del mismo autor y pesa ~2 kB).
**Motivo:** `useLiveQuery` evita escribir a mano la sincronización IndexedDB → React en la Fase 4.
Si se prefiere no usarlo, se puede quitar sin tocar `src/db/`.

### D-006 · Cobertura: umbral solo sobre la lógica

`vite.config.ts` aplica los umbrales (90 % líneas/funciones/sentencias, 85 % ramas) únicamente a
`src/srs/**`, `src/domain/**` y `src/io/**`.
**Motivo:** la regla 3 del contrato exige ≥ 90 % en el motor de repaso, no en la UI.
**Nota:** `npm run test:cov` falla por umbral hasta que la Fase 1 añada el motor y sus tests; el
comando de la definición de terminado es `npm run check` (typecheck + lint + tests).

### D-007 · Pureza de `src/srs` forzada por ESLint

Regla `no-restricted-imports` / `no-restricted-globals` en `eslint.config.js`: `src/srs/**` y
`src/domain/**` no pueden importar `dexie`, `react`, `zustand`, `@/db/*`, `@/io/*`, `@/state/*` ni
usar `window`, `document`, `localStorage` o `fetch`.
**Motivo:** convierte «el motor es puro» en algo verificable en CI, no en una convención.

### D-008 · Flags de TypeScript más allá de `strict`

Activados también `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`,
`noUnusedLocals/Parameters` y `verbatimModuleSyntax`.
**Motivo:** el motor indexa arrays de intervalos por etapa; `noUncheckedIndexedAccess` obliga a
tratar el caso «etapa fuera de rango», que es justo la transición a `mastered`.
