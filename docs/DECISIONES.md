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

## Fase 1 — Motor de repaso (2026-10-15)

### D-015 · El motor no genera ids ni lee el reloj

`grade()` y `override()` reciben `now` por parámetro y derivan el id del log de
`itemId` + fecha (`log-itm-1-2026-10-15T…`), salvo que se les pase `logId`.

**Motivo:** la regla 3 exige un motor puro. Con `Date.now()` o `crypto.randomUUID()` dentro no
habría tests deterministas. Quien persista puede sustituir el id por el suyo.

### D-016 · «Dominado» es una etapa canónica: la del último checkpoint + 1

El contrato dice que el ítem pasa a `mastered` «al superar la etapa 10». La etapa se guarda, por
tanto, como `intervals.length + 1` y ahí se queda: calificar «bien» otra vez no la sube a 12.

**Motivo:** un único valor para un único estado. Y `back1` desde dominado devuelve a la etapa 10,
que es lo que se espera.

### D-017 · Un ítem dominado no se pinta como vencido

`itemStatus()` comprueba `mastered` **antes** que `due`.

**Motivo:** el contrato §4.1 llama al repaso de un dominado «opcional (anual)». Si saliera en rojo
pulsante y en la cola de hoy, no sería opcional. `buildQueue()` lo incluye solo si se le pide con
`includeMastered`.

### D-018 · `itemStatus(state, now, schedule?)` lleva un tercer parámetro

La firma del contrato es `itemStatus(state, now)`, pero sin el horario no se puede saber cuál es la
última etapa y, por tanto, distinguir `mastered` de `review`. El tercer parámetro es opcional: sin
él la función sigue funcionando y nunca devuelve `mastered`.

### D-019 · Los intervalos derivados se normalizan en minutos, horas o días

«Difícil» en la etapa 10 de R10 son 262 800 minutos. Expresados en la unidad que divida exacto
salían «4380 h», que no se lee. La regla es: minutos por debajo de una hora, horas hasta dos días,
y días a partir de ahí, con un decimal como máximo («3,5 d», «182,5 d»).

**Motivo:** legibilidad. Semanas y meses siguen disponibles para los intervalos que define el
usuario; simplemente no se generan solos, porque «15 d» se lee mejor que «2,1 sem».

### D-020 · El modo adaptativo deduce el intervalo anterior, no lo guarda

SM-2 necesita el intervalo que se aplicó la última vez. En vez de añadir un campo a `ReviewState`,
se deduce de `dueAt − lastReviewedAt`.

**Motivo:** evita tocar el esquema del contrato (regla 6) y tiene un efecto deseable: si el usuario
fijó la fecha a mano, el modo adaptativo parte de la que él eligió.

### D-021 · Los parámetros de SM-2, elegidos aquí

El contrato solo fija la facilidad inicial (2,5) y su mínimo (1,3). El resto se eligió:
«otra vez» −0,20 y vuelta al intervalo mínimo; «difícil» −0,15 e intervalo × 1,2; «bien»
intervalo × facilidad; «fácil» +0,15 e intervalo × facilidad × 1,3. El modo adaptativo nunca
declara `mastered`, porque no tiene última etapa.

**Motivo:** son los valores habituales de SM-2. Si el usuario prefiere otros, se cambian en
`src/srs/grade.ts` sin tocar nada más.

### D-022 · `override()` recibe la calificación y la etapa de partida

El `ReviewLog` del contrato exige un `grade`, pero un ajuste manual no es una calificación. La
firma es `override(state, schedule, target, now, { grade, stageBefore })`: el flujo real es
calificar, ver la propuesta y ajustarla, así que el log del ajuste lleva la calificación que el
usuario dio. **Se guarda ese log, no los dos.**

### D-023 · Los tests corren en `Europe/Madrid`

`vite.config.ts` fija `TZ` en el entorno de Vitest.

**Motivo:** el motor ancla los intervalos de un día o más a la hora local, y los tests obligatorios
de cambio de horario necesitan una zona con DST para ser deterministas en cualquier máquina.
