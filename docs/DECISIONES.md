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

## Ingesta del palacio de fonética (2026-10-15)

### D-009 · Plantilla «Fonética», la cuarta

El contrato §6 incluye tres plantillas (Libre, Vocabulario, Gramática C1). El contenido de
`Guia_Fonetica 2026.docx` no encaja en ninguna: necesita símbolo del sonido, palabra clave,
comodín, teoría de producción, patrones de escritura, restricciones y minimal pairs.
→ Se añade una cuarta plantilla, **«Fonética»**, que **viaja como dato dentro de
`seed/fonetica45.json`**, no como código.

**Motivo:** la regla 2 prohíbe codificar contenido en la app. Las pantallas renderizan los tipos
de `Block` genéricos del contrato, así que no hay ni una línea de fonética en `src/`.

### D-010 · El conversor es un script de Python

`scripts/ingest_fonetica.py` lee el `.docx` con la librería estándar (`zipfile` + `xml.etree`).

**Motivo:** leer un `.docx` desde Node exigiría una dependencia de descompresión, y la regla 6 pide
preguntar antes de añadir dependencias. Es una herramienta offline que no entra en el bundle.
Python 3.14 ya está en la máquina. Se ejecuta con `npm run seed:fonetica`.

**Consecuencia:** quien regenere la semilla necesita Python. El JSON generado está versionado, así
que para _usar_ la app no hace falta.

### D-011 · `blocks` es lo que se muestra; `fields` lo que no cabe en una tabla

Cada ítem guarda su contenido mostrable en `blocks` (tablas, listas, notas) y en `fields` solo los
datos que una tabla de texto no puede llevar: el símbolo normalizado y el original, la palabra
clave, el comodín, el nº de patrones y el **mapa `palabra inglesa → URL de Cambridge`**.

**Motivo:** así las pantallas genéricas (Biblioteca, Editor de ítem) funcionan sin saber de
fonética, y no se duplica el texto: `fields.links` indexa 1 737 enlaces sin repetir las palabras.

### D-012 · La notación con barras es presentación

`fields.sound` guarda el símbolo limpio (`iː`); los títulos, anclas y reversos lo muestran entre
barras (`/iː/`).

**Motivo:** permite comparar, agrupar y buscar por símbolo sin tener que limpiar la cadena.

### D-013 · La teoría de producción no tiene campos fijos

Cada sonido explica lo suyo: unos hablan de labios, mandíbula, lengua y duración; los diptongos de
«posición inicial» y «deslizamiento hacia /ɪ/». El conversor reconoce **cualquier** etiqueta corta
seguida de dos puntos y conserva el nombre tal como lo escribe el documento.

**Motivo:** un modelo de cuatro campos fijos descartaba contenido real en la mayoría de las
secciones. Las claves canónicas (`lips`, `jaw`, `tongue`, `duration`) se rellenan cuando aparecen,
para quien quiera leerlas estructuradas.

### D-014 · La semilla se carga con `?url` + `fetch`, no con `import`

`src/features/inspector/Inspector.tsx` importa `seed/fonetica45.json?url` y la pide con `fetch`.

**Motivo:** un `import` normal haría que TypeScript infiriera el tipo literal de un JSON de 690 kB
(lento y frágil) y Vite lo incrustaría en el bundle de JavaScript. Con `?url` sale como asset
aparte: 693 kB, 93 kB comprimido. En la Fase 2 la semilla pasa a IndexedDB y esto desaparece.
