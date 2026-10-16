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

---

## Ingesta · Palacio «Fonética · Estándar 45» — ✅ terminada (2026-10-15)

Fuera del orden de fases: el usuario pidió cargar ya su primer palacio real. Se hizo como **datos**
(formato JSON v1 del contrato) más un visor provisional, sin adelantar las fases 1–3.

### Hecho

- **Conversor** `scripts/ingest_fonetica.py` (`npm run seed:fonetica`): lee
  `documentación/Guia_Fonetica 2026.docx` y la geometría de `STD45` en el traspaso de diseño, y
  emite la semilla y un informe. Reproducible: si se corrige el Word, se vuelve a correr.
- **Semilla** `seed/fonetica45.json` — 1 palacio, 5 zonas, **45 puntos**, **44 ítems**, 80 objetos
  de escena, la plantilla «Fonética», 1 mazo y el horario R10 con hora preferida 8:00.
- **Contenido por ítem**: equivalente en español, teoría de producción con las etiquetas del
  documento, diferencias británico/americano, y cuatro tablas — Ejemplos, Patrones del sonido,
  Restricciones (excepciones) y Minimal pairs — más la rima con su transcripción y traducción.
- **Hallazgo**: el «comodín» de cada sonido (Globo, Silla, Nalgas…) **codifica cuántos patrones de
  escritura tiene**. Verificado en 32 de 37 secciones con comodín; va como objeto de escena y como
  `fields.comodin`, y los desajustes están en el informe.
- **1 737 enlaces** al diccionario de Cambridge indexados por palabra, más los audios de las rimas.
- **Visor** `src/features/inspector/`: las dos siluetas con los 45 pines sobre el viewBox 200×480 y
  el detalle del punto con sus bloques. `BlockView` renderiza los tipos de `Block` del contrato sin
  saber nada de fonética, así que servirá igual para el palacio de gramática.
- **Dominio**: `Deck`, `Template`, `TemplateField`, `PalaceStyle`, `Bundle`; `Palace.style`,
  `Locus.dense`, `Locus.room` y el tipo `custom_plan`.

### Volumen ingresado

| Contenido                      | Cantidad |
| ------------------------------ | -------- |
| Secciones del documento        | 44       |
| Grupos de patrón               | 161      |
| Palabras en tablas de patrones | 962      |
| Ejemplos                       | 351      |
| Restricciones (excepciones)    | 171      |
| Minimal pairs                  | 301      |
| Enlaces de diccionario         | 1 737    |

### Comprobaciones

| Comando                 | Resultado                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `npm run seed:fonetica` | ✅ 45 puntos / 44 ítems · 20 anomalías del Word reportadas |
| `npm run check`         | ✅ typecheck + lint + **23 tests**                         |
| `npm run build`         | ✅ JSON como asset aparte (693 kB, 93 kB gzip)             |

Los tests cubren las invariantes de la semilla (ruta 1–45 sin huecos, integridad referencial,
≤ 5 objetos de escena por punto, IPA normalizada, tablas completas) y el renderizado real del
visor, incluido el aviso del punto sin contenido.

### Demo manual (4 pasos)

1. `npm run seed:fonetica` → imprime el resumen y regenera `docs/INGESTA_FONETICA.md`.
2. `npm run dev` → pestaña **Inspector**: los 45 puntos sobre las dos siluetas, el 34 en gris.
3. Toca **2 · Frente** → `/iː/ · CHEESE`, el comodín Globo con sus 9 patrones, y las tablas de
   ejemplos, patrones (40 palabras), restricciones y minimal pairs.
4. Toca **34 · Tobillo** → avisa de que falta esa sección en el Word.

### Pendiente

- **Las 20 anomalías de `docs/INGESTA_FONETICA.md`** son del documento, no del conversor. La más
  importante: falta la sección **34 · TOBILLO /s/**. Al corregir el Word basta volver a correr
  `npm run seed:fonetica`.
- **Palacio 2 · Gramática C1**: `documentación/100 grammar news.pdf` (218 páginas) está en el
  repositorio, esperando que el usuario describa la estructura que quiere, como hizo con fonética.
- La semilla se carga con `fetch` en el visor (D-014). En la Fase 2 pasa a IndexedDB.

---

## Fase 1 · Dominio + motor de repaso — ✅ terminada (2026-10-15)

### Hecho

`src/srs/`, **puro** (sin I/O, sin reloj propio, sin aleatoriedad; ESLint lo vigila):

| Archivo        | Qué contiene                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `intervals.ts` | Aritmética de intervalos: suma de calendario, normalización, anclaje a la hora preferida, etiquetas en español. |
| `presets.ts`   | R10, Rápido examen, Clásico 1-3-7-14-30, Adaptativo (SM-2) y Personalizado.                                     |
| `grade.ts`     | `grade()`, `override()`, `previewIntervals()`, `shortcuts()`, `computeNext()`.                                  |
| `status.ts`    | `itemStatus()`, `locusStatus()`, `compareUrgency()`.                                                            |
| `queue.ts`     | `buildQueue()`, `queueCounts()`.                                                                                |
| `index.ts`     | Fachada del módulo y `newReviewState()`.                                                                        |

Todo lo que pide el contrato §6: las cuatro calificaciones en modo checkpoints con sus reglas
(`againAction` reset/back1/back2, `hardFactor`, `easySkip`, `minInterval`), el paso a `mastered`,
el anclaje de los intervalos de un día o más a `dayStartHour`, los tres tipos de ajuste manual
(fecha exacta, +intervalo, salto de etapa), los seis atajos de la hoja de próximo repaso, el
estado de un ítem y el agregado de un punto, y la cola con vencidos primero, nuevos hasta el
límite diario y desempate por prioridad —más el recorrido por orden de ruta.

### Comprobaciones

| Comando            | Resultado                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| `npm test`         | ✅ **196 tests** en 10 archivos                                        |
| `npm run test:cov` | ✅ 98,5 % sentencias · 96,4 % ramas · 97,8 % funciones · 99,5 % líneas |
| `npm run check`    | ✅ typecheck + lint + tests                                            |

La batería obligatoria está completa: **las 44 combinaciones de calificación × etapa de R10**
comprobadas una por una contra la tabla del contrato, reset/back1/back2, dominado (incluido que la
etapa no siga creciendo y que un «otra vez» lo devuelva al principio), redondeo a la hora de inicio
del día, los tres overrides, **cuatro tests de cambio de horario** (ida y vuelta del horario de
verano, la hora que no existe y un tramo de 7 días que dura 169 h), límites diarios, orden de la
cola y estado agregado del punto. Los tests corren en `Europe/Madrid` para que el DST sea
determinista en cualquier máquina (D-023).

### Pendiente

- El motor todavía no está enchufado a ninguna pantalla: la sesión de repaso es Fase 4. Hasta
  entonces el Inspector solo muestra el contenido ingresado.
- `src/db/` sigue vacío: sin persistencia, nada de lo que calcula el motor se guarda (Fase 2).

---

## Fase 2 · Base de datos — ✅ terminada (2026-10-15)

### Hecho

`src/db/`, esquema **v1** de Dexie con migraciones versionadas:

| Archivo     | Qué contiene                                                                           |
| ----------- | -------------------------------------------------------------------------------------- |
| `db.ts`     | Las 11 tablas (las 10 entidades del contrato + `settings`) con sus índices.            |
| `repo.ts`   | CRUD de cada entidad y las operaciones transaccionales de ruta y asignación.           |
| `review.ts` | El puente con el motor: calificar, ajustar a mano, estados del mapa, colas, previsión. |
| `bundle.ts` | Importar y exportar un paquete JSON v1, sembrar y vaciar.                              |

**La transacción que pide el contrato:** borrar un punto deja sus ítems «sin asignar»
(`locusId: null`), no los borra, y se lleva solo sus objetos de escena. Lo mismo al borrar un
palacio entero. Borrar una zona deja los puntos sin zona.

**Lo que no se pudo indexar:** IndexedDB no admite booleanos como clave, así que `suspended` y
`dense` se filtran en memoria; y las filas con la clave a `null` quedan fuera del índice, por lo
que los ítems nuevos (`dueAt: null`) se buscan por `stage`. Está documentado en `db.ts`.

### La app ya lee de IndexedDB

- `src/bootstrap.ts` siembra el palacio de fonética **solo en el primer arranque** (D-029).
- El Inspector consulta con `useLiveQuery`: al calificar un ítem, su punto cambia de color sin
  recargar (D-030). Hay un test que lo comprueba.

### Comprobaciones

| Comando         | Resultado                                                 |
| --------------- | --------------------------------------------------------- |
| `npm run check` | ✅ typecheck + lint + **271 tests** en 13 archivos        |
| `npm run build` | ✅ 329 kB JS (104 kB gzip) + la semilla como asset aparte |

74 tests nuevos sobre la base de datos, con IndexedDB en memoria (D-027): las transacciones de
borrado una por una, la ruta (insertar, reordenar, compactar, no desbordar a otro palacio), el
estado de repaso, el horario que hereda cada ítem de su mazo, los dos caminos de calificación
(guardar y solo proponer), el ajuste manual con un único log, los estados del mapa, las cinco
colas y la ida y vuelta completa de la semilla de fonética por la base de datos.

### Pendiente

- No hay pantalla para importar ni exportar: eso es Fase 3, con los esquemas Zod y la vista previa
  de cambios. El motor y la base ya están listos para recibirlos.
- Sigue sin existir la sesión de repaso: `applyGrade()` funciona y está probado, pero nadie lo
  llama desde la UI todavía (Fase 4).

---

## Fase 4 (primera parte) · Hoy y la sesión de repaso — ✅ (2026-10-15)

Ya se puede **estudiar**: el ciclo completo del contrato §4.5 funciona de punta a punta.

### Hecho

| Pantalla / componente              | Qué hace                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/BodyMap.tsx`       | El mapa compartido: cámara al punto, pines contra-escalados, halo pulsante en vencidos, rayado en pausados, estrella en dominados. |
| `src/features/today/Today.tsx`     | Saludo, racha, vencidos/nuevos/dominados, «Repasar ahora (N)», previsión de 7 días y el mapa.                                      |
| `src/features/session/Session.tsx` | Las tres fases (señalar → escena → contenido), los 4 botones con su intervalo, teclado, progreso y resumen.                        |
| `NextReviewSheet.tsx`              | La hoja del próximo repaso: **Aceptar** como acción principal y los ajustes bajo «Avanzado».                                       |
| `App.tsx`                          | React Router: `/`, `/sesion`, `/inspector`, `/tokens`.                                                                             |

**El flujo:** se señala el punto en el cuerpo con zoom y su ancla → el usuario intenta recordar →
espacio (o «Revelar») muestra los objetos de escena, escalonados → otro espacio muestra el
contenido → los cuatro botones con su intervalo debajo (`10 min`, `1 d`…) → la hoja con la fecha
propuesta y la etapa → **Aceptar**, o «Avanzado» para los seis atajos, la fecha y hora exactas o
saltar a una etapa. Teclado: **espacio** revela, **1–4** califican.

### Comprobaciones

| Comando         | Resultado                                          |
| --------------- | -------------------------------------------------- |
| `npm run check` | ✅ typecheck + lint + **293 tests** en 14 archivos |
| `npm run build` | ✅ 415 kB JS (132 kB gzip)                         |

21 tests nuevos sobre las pantallas, con la base de datos real: las tres fases revelándose en
orden, que el reverso **no** se ve antes de tiempo, los intervalos de cada botón, que **nada se
escribe hasta aceptar**, que un atajo deja un único log con `manual: true`, el salto de etapa, el
teclado, la cola completa hasta el resumen, el recorrido sin filtrar por vencimiento y los contadores
de Hoy.

### Pendiente de la Fase 4

Faltan las pantallas de **editor de palacio**, **detalle del punto editable**, **editor de ítem**,
**biblioteca**, **horarios**, **estadísticas**, **casas** y **onboarding**. El Inspector hace de
detalle de punto en modo lectura mientras tanto.

### Pendiente de la Fase 3

Importar y exportar sigue sin pantalla ni validación Zod. La semilla entra por `bootstrap.ts`.

---

## Fase 3 · Importar y exportar — ✅ terminada (2026-10-15)

### Hecho

| Archivo                       | Qué contiene                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/io/schema.ts`            | Esquemas Zod del JSON v1, incluidos `style`, `planData`, `rooms`, `room` y `dense`.                                                            |
| `src/io/locus-ref.ts`         | Resolución de `locusRef` por texto: número de ruta, nombre de parte o mueble, con o sin palacio delante.                                       |
| `src/io/plan.ts`              | La **vista previa**: valida, cuenta qué se crea y qué se sobrescribe, resuelve referencias y avisa de los problemas de integridad. No escribe. |
| `src/io/csv.ts`               | Lector de CSV propio, mapeo de columnas sugerido por las cabeceras, y export a CSV.                                                            |
| `src/io/download.ts`          | Copia de seguridad como archivo.                                                                                                               |
| `src/features/import-export/` | La pantalla, en la ruta `/datos`.                                                                                                              |

**Lo que resuelve `locusRef`:** «Cuerpo 1 · Verbal + Nominal · L8», «Casa familiar · 37»,
«Cuerpo 1 · Verbal + Nominal · Hombro derecho», «Casa familiar · Lámpara de pie · Salón» y, si el
nombre es único en toda la base, «Mentón» a secas. Ignora mayúsculas y acentos, admite `·`, `|`,
`/` y `>` como separadores, y **nunca adivina**: si hay dos candidatos lo dice.

### Comprobaciones

| Comando            | Resultado                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| `npm run check`    | ✅ typecheck + lint + **366 tests** en 19 archivos                       |
| `npm run test:cov` | ✅ 98,5 % sentencias · 94,8 % ramas (umbral sobre `srs`, `domain`, `io`) |
| `npm run build`    | ✅ 523 kB JS (163 kB gzip)                                               |

73 tests nuevos: el lector de CSV caso por caso (comillas, saltos dentro de celda, BOM, `\r\n`,
separadores), las ocho formas de `locusRef` y sus dos fracasos, la validación Zod señalando el
campo exacto (`loci.0.pos.x`), el recuento de crear/sobrescribir, los avisos de integridad y el
flujo completo de la pantalla: subir archivo → vista previa → confirmar, incluido que **la base no
se toca hasta confirmar**.

### Pendiente de la Fase 4

Editor de palacio, detalle del punto editable, editor de ítem, Biblioteca, Horarios, Estadísticas,
Casas y Onboarding.

---

## Fase 4 (segunda parte) · Horarios, Biblioteca y Progreso — ✅ (2026-10-15)

### Hecho

| Pantalla                           | Ruta            | Qué hace                                                                                                                                                        |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/schedules/Schedules.tsx` | `/horarios`     | Los cinco presets y los del usuario; editor de intervalos con **la fecha en que caería cada etapa**, reglas de calificación, hora preferida e intervalo mínimo. |
| `features/library/Library.tsx`     | `/biblioteca`   | Todos los ítems con búsqueda, filtro por estado y por zona, bandeja «Sin asignar» y acciones en lote (pausar, reanudar, quitar del punto, borrar).              |
| `features/stats/Stats.tsx`         | `/estadisticas` | Previsión de 30 días, reparto de los puntos por estado, retención por zona y cuerpo de calor.                                                                   |
| `components/NumberField.tsx`       | —               | Campo numérico que se puede vaciar para reescribir (ver D-044).                                                                                                 |

También: `projectIntervals()` en el motor, que proyecta en qué fecha caería cada etapa de un
horario aprobando siempre.

### Comprobaciones

| Comando            | Resultado                                          |
| ------------------ | -------------------------------------------------- |
| `npm run check`    | ✅ typecheck + lint + **389 tests** en 20 archivos |
| `npm run test:cov` | ✅ 98,6 % sentencias · 94,8 % ramas                |
| `npm run build`    | ✅ 538 kB JS (166 kB gzip)                         |

23 tests nuevos: los presets en su orden, las diez etapas de R10 con su fecha, editar un intervalo
y que se guarde (incluido **vaciar el campo y reescribirlo**, que era un bug), añadir y quitar
etapas sin quedarse sin ninguna, cambiar las reglas; en Biblioteca los cuatro filtros y las cuatro
acciones en lote; y en Progreso la previsión, el reparto y el cálculo de retención.

### Pendiente de la Fase 4

Editor de palacio (crear y mover puntos, zonas, ruta), detalle del punto editable, editor de ítem
por bloques, Casas (los 10 planos) y Onboarding.

---

## Fases 4, 5 y 6 · cierre — ✅ (2026-10-16)

### Pantallas que faltaban de la Fase 4

| Pantalla                                  | Ruta          | Qué hace                                                                                                                             |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `features/palace-editor/PalaceEditor.tsx` | `/editor`     | Modos Puntos / Zonas / Ruta: tocar el cuerpo crea un punto, arrastrar lo mueve, pintar zonas tocando, reordenar y renumerar la ruta. |
| `features/locus/LocusEditor.tsx`          | `/punto/:id`  | Ancla, nombre, zona, notas, objetos de escena reordenables (máx. 5), ítems del punto e historial.                                    |
| `features/item-editor/ItemEditor.tsx`     | `/item/:id`   | Editor por bloques de los siete tipos del contrato, asignación palacio → zona → punto y vista previa.                                |
| `features/onboarding/Onboarding.tsx`      | `/bienvenida` | Cuatro pasos: qué es, tu palacio, tu ritmo, el primer repaso.                                                                        |

### Fase 6 · pulido

- **Notificaciones** de repasos vencidos (`features/notifications/notify.ts`): permiso a petición,
  cuatro horas de descanso entre avisos, comprobación al abrir y al volver del segundo plano.
- **Copia de seguridad automática** (`features/import-export/autobackup.ts`): una al día, las cinco
  últimas, descargables desde «Datos».
- **Teclado**: espacio revela, 1–4 califican; nombre accesible explícito en los botones de
  calificar y `role="alert"`/`role="status"` en los avisos.

### Fase 5 · e2e con Playwright

`npm run e2e` — **42 tests en Chromium real contra el build de producción**, en escritorio y en
móvil (Pixel 5): el arranque con siembra, el ciclo completo de una tarjeta, el teclado, el ajuste
manual, la persistencia tras recargar, las siete pantallas sin errores de página y el
desbordamiento móvil en las ocho rutas.

### Comprobaciones

| Comando            | Resultado                                          |
| ------------------ | -------------------------------------------------- |
| `npm run check`    | ✅ typecheck + lint + **427 tests** en 22 archivos |
| `npm run e2e`      | ✅ **42 tests** (escritorio + móvil)               |
| `npm run test:cov` | ✅ 98,6 % sentencias · 94,8 % ramas                |
| `npm run build`    | ✅ sin errores                                     |

### El bug que solo el navegador podía encontrar

`.tabs` tenía ocho enlaces en un flex sin `flex-wrap`: desbordaban a lo ancho y Chrome móvil
**alejaba el zoom de toda la app, dejándola al 56 %**. Los 427 tests de jsdom no podían verlo
—jsdom no maqueta—. Arreglado y con test de regresión en las ocho rutas (D-054).

### Lo que queda fuera

- **Casas** (los 10 planos de `pc-houses.js`, ≥ 130 puntos cada una): es la pieza más grande que
  falta de la Fase 4. El dominio ya la admite (`custom_plan`, `Palace.planData`, `Palace.rooms`,
  `Locus.room`) y el import también, pero el generador de planos y su visor no están portados.
- **Mis cuerpos** (`BodyStyler`): `Palace.style` existe y se guarda; falta la pantalla para
  editarlo.
- **Rendimiento con 500+ puntos y 10 000 ítems**: no medido. Con 45 puntos y 44 ítems va sobrado.
- **Palacio 2 · Gramática C1**: esperando la estructura que quiera el usuario.

---

## Casas · los diez planos — ✅ (2026-10-16)

La última pieza grande de la Fase 4.

### Hecho

- **`scripts/ingest_casas.mjs`** (`npm run seed:casas`) → `seed/casas.json`:
  **10 casas · 50 zonas · 1 363 puntos · 123 habitaciones · 466 kB de planos**.
  Cada mueble es un punto, cada casa empieza en la **Puerta principal** y la ruta va 1…n sin
  huecos, como manda `PROMPT_MEJORAS.md` §4.2.
- **Modo plano en `BodyMap`**: pinta el plano, toma el `viewBox` de `planData` y dimensiona los
  puntos con la fórmula del diseño. En plano ocupa todo el ancho (D-063).
- **Selector de palacio** (`PalaceChips`) y palacio actual guardado (D-064): sin esto la app
  enseñaba siempre el primero y las casas eran invisibles.

**No se cargan al arrancar**: se importan desde «Datos» eligiendo `seed/casas.json`.

### Comprobaciones

| Comando              | Resultado                                          |
| -------------------- | -------------------------------------------------- |
| `npm run seed:casas` | ✅ 10 casas, 1 363 puntos                          |
| `npm run check`      | ✅ typecheck + lint + **455 tests** en 24 archivos |
| `npm run e2e`        | ✅ 46 tests en escritorio y móvil                  |

14 tests nuevos: que las diez casas son `custom_plan` con su plano y sus habitaciones, que cada
una tiene ≥ 130 puntos, que **la ruta empieza en la Puerta principal** y va 1…n, que la semilla
**pasa la validación Zod del import sin un solo aviso**, que el mapa pinta el plano en vez de las
siluetas y que los chips cambian de palacio.

### Lo que queda

- **Rendimiento con 10 000 ítems**: con 1 363 puntos cargados la app va bien, pero no está medido
  a esa escala.
- **Palacio 2 · Gramática C1**: esperando la estructura.
- Las cuatro claves de apariencia que el SVG no permite (`docs/HANDOFF_DISENO.md` §3.11).

---

## La parte del cuerpo y las formas de estudiar — ✅ (2026-10-16)

### Hecho

- **El nombre de la parte en el idioma que se estudia vive en el punto** (D-066):
  `Locus.partNameEn` y `Locus.partIpa`. Sale al lado del nombre en el **título del detalle**, en
  **cada fila de la lista de ruta** y en la **sesión**, bajo el punto señalado. Y se edita desde el
  detalle del punto.
- **Las cinco unidades de repaso del contrato §4.4** con su puerta de entrada (D-067): este punto,
  esta zona, todo el palacio, el recorrido y la cola de hoy. Cada zona de la cabecera del Inspector
  es ahora un enlace que lanza su repaso.
- **Más edición del cuerpo**: renombrar puntos y zonas desde el editor sin salir, con
  `InlineText` (D-068), y un atajo al detalle del punto elegido.

### Comprobaciones

| Comando         | Resultado                                          |
| --------------- | -------------------------------------------------- |
| `npm run check` | ✅ typecheck + lint + **474 tests** en 25 archivos |
| `npm run e2e`   | ✅ 46 tests en escritorio y móvil                  |

18 tests nuevos: que la traducción está en los 44 puntos que la tienen y **no** en el 34, que sale
en el título, en la lista y en la sesión, que se edita y se guarda; las cinco unidades de repaso
con sus conteos (1 punto, 15 de la zona Cabeza, 44 del palacio, 44 del recorrido, 20 de la cola de
hoy); y el renombrado con Enter, al salir del campo y vaciándolo.

### Dos bugs que salieron de paso

- Renombrar escribía en IndexedDB en cada tecla y el texto se pegaba mal. Tercera vez que aparece
  el mismo patrón de campo controlado (D-044, D-048, D-068).
- `setPointerCapture` no existe en jsdom y su excepción impedía seleccionar un punto en el editor
  (D-069).
