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

## Fase 2 — Base de datos (2026-10-15)

### D-024 · Tabla `settings` de clave/valor

No está en el contrato, pero la app necesita guardar el límite diario de nuevos, la hora preferida,
el tema y la preferencia de «mostrar la hoja de próximo repaso». Una tabla `settings` con
`key`/`value` y `getSetting(key, fallback)` evita inventar una entidad por cada ajuste.

### D-025 · Borrar un punto **no** renumera la ruta

Los números de ruta son referencias estables: el import los usa (`«Cuerpo 1 · L8»`,
`«Casa familiar · 37»`). Si al borrar el punto 1 todo se corriera, un import antiguo apuntaría a
otro sitio. Para compactar hay una operación aparte, `resequenceRoute()`, y para insertar
`insertLocus()`, que sí corre los de detrás (es lo que pide el flujo de las casas).

### D-026 · Borrar un ítem se lleva su estado de repaso y su historial

Sin el ítem, un `ReviewState` y sus `ReviewLog` no significan nada y quedarían huérfanos
falseando las estadísticas.

**Contraste deliberado:** borrar un **punto** no borra sus ítems, los deja «sin asignar». El
contenido es lo valioso; la colocación en el cuerpo se puede volver a hacer.

### D-027 · `fake-indexeddb` como dependencia de desarrollo

jsdom no trae IndexedDB, así que sin ella la capa de persistencia no se podría testear. Se carga en
`tests/setup.ts`, **antes que cualquier módulo**, porque Dexie la busca al importarse.

**Aviso al usuario (regla 6):** es una dependencia nueva, solo de desarrollo, que nunca entra en el
bundle. Si prefieres no tenerla, los 74 tests de `tests/db/` se caen y la persistencia queda sin
cobertura.

### D-028 · `applyOverride()` deja un solo log, no dos

El flujo real es: el usuario califica, ve la fecha propuesta y la ajusta. Si se guardara la
calificación y luego el ajuste habría dos entradas en el historial para un solo repaso. Por eso
`applyOverride(itemId, target, now, { grade })` aplica la calificación **en memoria** y guarda
únicamente el log del ajuste, con `manual: true` y la etapa de partida correcta.

Para ver la propuesta sin escribir nada está `proposeGrade()`.

### D-029 · La semilla se carga solo en el primer arranque

`src/bootstrap.ts` deja los presets y, **solo si la base está vacía**, importa
`seed/fonetica45.json`. En el segundo arranque no toca nada: lo que el usuario haya editado se
queda como está. Cuando exista la pantalla de importación (Fase 3), sembrar será una acción suya y
el bootstrap se quedará solo con los presets.

### D-030 · La UI lee con `useLiveQuery`

El Inspector consulta la base con `useLiveQuery` de `dexie-react-hooks` (D-005): al calificar un
ítem, el color de su punto cambia sin que nadie recargue nada. Es lo que justifica esa dependencia.

## Fase 4 (primera parte) — Hoy y la sesión (2026-10-15)

### D-031 · La cola se congela al entrar en la sesión

`Session` arma la cola una vez al montarse, no con `useLiveQuery`. Si se recalculara en vivo, al
calificar una tarjeta la cola se reordenaría y las siguientes se moverían bajo los pies del
usuario.

El mapa y la pantalla de Hoy sí van en vivo: ahí el cambio instantáneo es justo lo que se quiere.

### D-032 · Calificar no escribe hasta que el usuario acepta

El contrato §4.3 dice que el usuario **siempre** ve la fecha propuesta y puede cambiarla. Así que
tocar «Bien» solo calcula la propuesta con `previewIntervals()` y abre la hoja; se escribe en
`Aceptar` (con `applyGrade`) o al elegir un ajuste (con `applyOverride`). Nunca las dos cosas, así
que el historial tiene **un log por repaso**.

Hay un test que lo comprueba: con la hoja abierta, `reviewLogs` sigue vacía.

### D-033 · Nombre accesible explícito en los botones de calificar

Cada botón lleva `aria-label="Bien · 10 min"` y `aria-keyshortcuts`. Sin el `aria-label`, el nombre
accesible sale de concatenar la etiqueta, el intervalo y el número de tecla sin separación
(«Bien10 min3»), que es lo que oiría un lector de pantalla.

### D-034 · Reloj de 24 horas, no el de 12 del prototipo

El prototipo escribe «jueves 16, 8:00 a. m.»; la app escribe «Jueves 16 de octubre, 8:00», y
«Hoy, 19:50» o «Mañana, 8:00» cuando toca. Es menos ambiguo y se lee de un golpe.
Anotado también en `docs/HANDOFF_DISENO.md`.

### D-035 · `BrowserRouter`, no `HashRouter`

Las URLs quedan limpias (`/sesion`) y el service worker que genera `vite-plugin-pwa` sirve
`index.html` como `navigateFallback`, así que los enlaces profundos funcionan instalada y sin
conexión.

### D-036 · El mapa es un componente, no código repetido

`src/components/BodyMap.tsx` lo usan Hoy, la sesión y el Inspector. Recibe los puntos, sus estados
y el punto enfocado; no consulta nada. Implementa lo que pide el diseño: cámara de 700 ms al punto,
pines contra-escalados para que no cambien de tamaño con el zoom, halo pulsante en los vencidos,
rayado en los pausados, estrella en los dominados y número oculto por debajo de 13 px.

## Fase 3 — Importar y exportar (2026-10-15)

### D-037 · Zod es la frontera de confianza

Todo lo que entra por importación pasa por `src/io/schema.ts`. Después de validar, los datos se
usan sin más comprobaciones: el esquema refleja `src/domain/types.ts` uno a uno.

### D-038 · El nombre de un palacio puede llevar el separador dentro

«Cuerpo 1 · Verbal + Nominal · L8» tiene tres partes separadas por «·», pero el palacio son las
dos primeras. Partir por el primer separador fallaba con los nombres reales del proyecto, así que
`resolveLocusRef()` prueba el **prefijo de palacio más largo** que encaje y usa el resto para
identificar el punto. Lo descubrió un test.

### D-039 · Una referencia ambigua nunca se adivina

Si «Hombro derecho» existe en dos palacios, `resolveLocusRef()` devuelve `ambiguous` con los
candidatos y la vista previa los muestra. El ítem entra **sin asignar**: el contenido no se pierde
y el usuario lo coloca luego desde la bandeja.

### D-040 · Los problemas de integridad son avisos, no errores

Que un ítem apunte a una plantilla que no está en el paquete no impide importar: puede estar ya en
la base, y el contrato permite el import parcial. Se listan como avisos. Solo los fallos de
**formato** (Zod) bloquean, y entonces no se escribe nada.

### D-041 · `clean()`: Zod y `exactOptionalPropertyTypes`

Zod devuelve los campos opcionales como `prop?: T | undefined`; el dominio los declara `prop?: T`.
`clean()` quita las claves que valen `undefined`, con lo que el objeto encaja de verdad con el tipo
—y además no se guardan claves vacías en IndexedDB.

### D-042 · Lector de CSV propio, sin dependencias

`parseCsv()` cubre comillas, comillas escapadas (`""`), saltos de línea dentro de una celda,
`\r\n`, el BOM que mete Excel y separador configurable (se adivina entre coma, punto y coma y
tabulador). Son ~40 líneas con tests; una dependencia no se justificaba.

### D-043 · Sin escapes `\uXXXX` en el código fuente

Al escribir los archivos, los escapes `\u0300` y `\uFEFF` acababan como el carácter literal en el
fuente —invisible y frágil—. Se usan en su lugar `\p{Diacritic}` con la bandera `u` y, donde hace
falta el BOM, el escape dentro de una cadena de regex construida sin ambigüedad.

## Fase 4 (segunda parte) — Horarios, Biblioteca y Progreso (2026-10-15)

### D-044 · `NumberField`: el campo numérico guarda su propio texto

Un `<input type="number">` controlado por el número no se puede vaciar para reescribirlo: al
borrarlo el padre rechaza el `0`, vuelve a pintar el valor viejo y lo tecleado se va pegando
delante («10» → «1015»). `src/components/NumberField.tsx` mantiene el texto dentro y solo entrega
números válidos. Lo encontró un test, y ese test se queda como regresión.

El refresco cuando el valor llega cambiado de fuera se hace **durante el render** (el patrón de
React para ajustar estado al cambiar una prop), no en un efecto: así no hay segundo pintado.

### D-045 · Los horarios se listan en el orden del contrato

`db.schedules.toArray()` los devuelve por id, así que el primero era «Adaptativo». La pantalla los
ordena con los presets del contrato primero —R10 al frente, que es el horario por defecto— y el
resto por nombre.

### D-046 · Los presets son editables

El contrato dice «R10 (10 checkpoints, **editable**)», así que la pantalla deja editar cualquier
horario, presets incluidos. Lo que se guarda afecta a los próximos repasos de los ítems que lo
usan; las etapas en las que ya están no se mueven.

### D-047 · La retención se mide sobre el historial, no se estima

«Retención por zona» es la proporción de repasos de esa zona que **no** fueron «otra vez», contada
sobre `reviewLogs`. Sin repasos suficientes la pantalla lo dice en vez de pintar un cero
engañoso.

## Fases 4–6 · cierre (2026-10-16)

### D-048 · Las tablas también se editan como texto

`TableBlockEditor` guarda su propio texto, por el mismo motivo que `NumberField` (D-044): si el
valor saliera del bloque, al vaciar el área la tabla se reconstruiría con una columna por defecto y
lo tecleado se pegaría detrás. Las filas cortas se cuadran al ancho de la cabecera, porque una
tabla desigual rompe el render.

### D-049 · Borrar un punto desde el editor no borra sus ítems

Es la misma transacción de la Fase 2, ahora con un botón: los ítems pasan a «Sin asignar» y la
pantalla lo dice en voz alta («Borrar un punto no borra sus ítems»). Igual con las zonas.

### D-050 · Las notificaciones se comprueban al abrir, no en segundo plano

Una PWA instalada no puede despertarse sola de forma fiable para avisar, así que `notifyDue()` se
llama al arrancar y en `visibilitychange`, con **cuatro horas de descanso** entre avisos. El
permiso se pide solo desde un gesto del usuario, nunca al cargar.

### D-051 · La copia automática se guarda dentro, no se descarga

`runAutoBackup()` guarda una copia al día —las cinco últimas— en la tabla `settings`, y desde
«Datos» se baja la que haga falta. Descargar sola pediría permiso al navegador cada vez.

**Límite declarado:** si se borran los datos del sitio, las copias se van con ellos. La pantalla lo
advierte: no sustituye a bajarse una copia de vez en cuando.

### D-052 · El e2e corre contra el build, no contra el servidor de desarrollo

`playwright.config.ts` levanta `vite preview` tras `npm run build`, en `127.0.0.1` (sin
`--host 127.0.0.1`, vite escucha en `localhost`, Playwright sondea `127.0.0.1` y se queda
esperando hasta agotar el tiempo). Así se prueba lo que de verdad se publica, service worker
incluido.

### D-053 · Un contexto por test basta: no se borra IndexedDB a mano

Playwright da un contexto nuevo por test, así que la base ya empieza limpia. Borrarla tras cargar
la app competía con la siembra —que la tiene abierta— y dejaba la base a medias.

### D-054 · El móvil se prueba midiendo el desbordamiento, no a ojo

`.tabs` tenía ocho enlaces en un flex **sin `flex-wrap`**: medían ~700 px, desbordaban a lo ancho y
Chrome móvil alejaba el zoom de **toda la app** (se veía al 56 %, con `innerHeight` 1294 sobre un
visual de 727). Los 427 tests de jsdom no podían verlo, porque jsdom no hace maquetación.

El e2e ahora comprueba en las ocho rutas que `scrollWidth <= clientWidth` y que `innerHeight` no se
dispara sobre el viewport visual. Es el test que habría cazado el bug.

### D-055 · La lista de ruta va en una sola columna

Estaba en una rejilla de `auto-fill` que daba dos columnas de 197 px. Una rejilla se llena **por
filas**, así que la columna izquierda quedaba 1, 3, 5, 7… y la derecha 2, 4, 6, 8: el recorrido,
que es un orden, se leía mal.

Un recorrido se lee de arriba abajo. El e2e lo comprueba geométricamente: cada punto tiene que
estar más abajo que el anterior y alineado a la misma izquierda.

### D-056 · La parte del cuerpo traducida abre cada ítem

La cabecera del Word da la parte en inglés con su IPA —«2. FRENTE (Forehead /ˈfɔːhed/)»— y eso
también se memoriza. Estaba en `fields.partEn` / `fields.partIpa` pero no se mostraba en ninguna
pantalla. Ahora es el **primer bloque** de cada ítem, como `bilingual`, que es el tipo del contrato
para un par inglés/español.

### D-057 · Los minimal pairs recuperan su columna «vs.»

La había quitado por ser siempre el mismo texto, y las cabeceras quedaban
`Inglés · Transcripción · Español` repetidas sin nada que dijera dónde acaba una palabra y empieza
su contraste. El Word la trae; se queda.

### D-058 · La silueta se incrusta, no se enlaza

El mapa pintaba las siluetas con `<image>`, y así el CSS no entra en el dibujo: la apariencia del
palacio (`Palace.style`) **estaba en la semilla y la app la ignoraba entera**. Ahora el SVG se
incrusta con `?raw`, se le quita la metadata C2PA —7,7 kB de los 13 kB del archivo— y los `id` de
las capas se vuelven clases, porque los dos cuerpos conviven en el mismo documento y dos
`id="outline"` serían inválidos.

Con eso, seis de las diez claves de `Palace.style` funcionan de verdad: `accent`, `detail`, `line`,
`skin`, `vol` y `draw: neon`.

### D-059 · Los siete tonos de piel se eligieron aquí

El traspaso nombra los valores de `skin` (`neutral`, `porcelana`, `arena`, `miel`, `canela`,
`ebano`, `plano`) pero no da sus colores. Están en `src/design/body-style.ts` en oklch, de más
claro a más oscuro; `plano` es sin relleno. Si el diseño los define, se cambian ahí y ya.

### D-060 · Lo que no se puede aplicar se dice, no se finge

`hair`, `hairColor`, `facial` y `glasses` necesitan capas que el SVG entregado no tiene, y
`draw: lapiz` necesita el sombreado rayado. «Mis cuerpos» los marca como pendientes y explica por
qué, en vez de ofrecer botones que no hacen nada. Ver `docs/HANDOFF_DISENO.md` §3.11.

## Casas · los diez planos (2026-10-16)

### D-061 · Las casas se generan a semilla, no se llevan en la app

`design_handoff_palacio_corporal/pc-houses.js` ya hace todo el trabajo geométrico (muros, puertas,
habitaciones y la ruta en serpentina de `PROMPT_MEJORAS.md` §4.2). `scripts/ingest_casas.mjs`
(`npm run seed:casas`) lo importa y traduce su forma a las entidades del contrato.

**No se cargan al arrancar.** Son 1 363 puntos y 466 kB de SVG —casi 1 MB de JSON— para palacios
que puede que nunca uses. Se importan a mano desde «Datos», que es el camino del contrato. Así el
generador tampoco entra en el bundle.

### D-062 · Las casas vienen amuebladas pero vacías

El generador trae un `item` de ejemplo en cada mueble; es contenido de relleno del prototipo, como
el `PH` de `pc-data.js` (D-001 bis). La semilla crea **solo los puntos**: cada mueble es un locus y
el contenido lo pones tú.

### D-063 · El mapa aprende un modo «plano»

`BodyMap` acepta `plan`: con él pinta el plano en lugar de las dos siluetas, toma el `viewBox` de
`planData` y coloca los puntos sobre ese lienzo. El tamaño del punto sale de la fórmula del diseño
(`0,3 × √(área / nº de puntos)`, §5) con un suelo para que siga siendo tocable.

Un plano es apaisado, así que en el Inspector y en el Editor ocupa **todo el ancho** y el detalle
va debajo: metido en la columna estrecha del cuerpo, los puntos quedaban en 8 px, por debajo del
mínimo de 9 px que pide el diseño. Con el ancho completo miden 21 px.

### D-064 · Un palacio actual, guardado

Con once palacios, «el primero de la lista» dejó de servir: la app enseñaba siempre fonética y no
había forma de ver las casas. `getCurrentPalace()` lee el elegido de `settings` y cae al primero si
ya no existe; `PalaceChips` lo cambia y todas las pantallas lo siguen.

### D-065 · La suite se estabiliza por configuración, no parcheando tests

Varios tests importan semillas de ~1 MB en IndexedDB y la suite salía intermitente. En vez de ir
subiendo esperas una a una: `testTimeout` de 20 s y `maxWorkers: 4` en `vite.config.ts`, y un
reintento en Playwright. Cada test que falló alguna vez pasa en solitario; lo que fallaba era la
espera, no la app.

## La parte del cuerpo y las formas de estudiar (2026-10-16)

### D-066 · El nombre traducido es del punto, no del ítem

Primero lo puse como un bloque dentro del ítem y no servía: aparecía enterrado bajo el anverso y
el reverso, apilado en vez de al lado, y no salía en el título ni en la lista de ruta ni en la
sesión.

La parte del cuerpo es una propiedad **del punto**, así que ahí vive:
`Locus.partNameEn` y `Locus.partIpa` [AMPLÍA CONTRATO]. Con eso sale al lado del nombre en todas
partes —«Pelo / Cabello · Hair /heər/»— y el bloque duplicado desaparece del ítem.

### D-067 · Las cinco unidades de repaso, con su puerta de entrada

El contrato §4.4 permite repasar por ítem, punto, zona, palacio, recorrido y la cola de hoy. El
motor y la base lo soportaban desde la Fase 2, pero solo había botón para «hoy» y «recorrido».
Ahora la sesión lee `scope`, `zona` y `punto` de la URL, y hay dónde pulsarlas: en el detalle del
punto, en cada zona de la cabecera y en Hoy.

Fuera de la cola de hoy **no se aplica el límite diario de nuevos**: si pides una zona, la quieres
entera.

### D-068 · `InlineText`: el tercer campo que se escribía solo

Renombrar un punto escribía en IndexedDB **en cada tecla**, con una consulta en vivo detrás: el
valor volvía a medio teclear y lo escrito se pegaba mal («Pelo / Cabelloo»). Es el mismo problema
que `NumberField` (D-044) y que la tabla (D-048), ya por tercera vez.

`src/components/InlineText.tsx` guarda su borrador y confirma al salir del campo o con Enter;
Escape descarta y vaciarlo no borra el nombre. Lo usan el renombrado de puntos y el de zonas.

### D-069 · `setPointerCapture` va con guardia

No existe en jsdom y la excepción se llevaba por delante el toque del punto en el editor: tocar un
pin no seleccionaba nada. Sin captura el arrastre sigue funcionando, así que se ignora el fallo.

## Auditoría de móvil (2026-10-16)

### D-070 · Todo control táctil llega a 44 px

Veintitantas reglas CSS estaban en 20, 26, 28, 32 o 36 px. La lista de ruta —la forma principal de
elegir un punto— medía 26 px de alto. Todas suben a `var(--hit)`.

Los **pines del cuerpo** son la excepción justificada: el dibujo sigue midiendo lo que manda el
diseño (5,2 % del alto, 2,6 % si es denso), pero llevan detrás un **círculo transparente** que
nunca baja del mínimo táctil. El dibujo no cambia; lo que se puede tocar, sí.

### D-071 · Un punto que no hace nada no se anuncia como botón

En la sesión los pines solo informan, pero tenían `role="button"` y `tabIndex`: 45 controles
inertes en el lector de pantalla y en el recorrido por teclado. Ahora el rol depende de si hay
manejador.

### D-072 · La navegación móvil es una fila que se desliza

Ocho destinos envueltos ocupaban 144 px de cabecera —un quinto de la pantalla— antes de ver nada.
En una sola fila deslizable, con el tema reducido a su símbolo, la cabecera baja a 50 px.

### D-073 · El alto del mapa lo decide el CSS, no el componente

Iba en línea (`style="max-height: 48dvh"`) y ganaba a cualquier media query: en la sesión el mapa
se llevaba media pantalla y el contenido de la tarjeta empezaba fuera de vista. Ahora `maxHeight`
admite `none` y entonces el componente no escribe nada en línea.

### D-074 · La sesión espera a que haya datos

Entrar directo a `/sesion` armaba la cola contra una base todavía vacía —la siembra iba en
paralelo— y decía «no hay nada que repasar». Ahora observa el número de ítems y arma la cola
cuando hay algo. Sigue congelándose después (D-031).

### D-075 · GitHub Pages, con la ruta base en una variable

De los sitios que sirven HTTPS gratis —requisito para instalar la app y para los avisos— Pages es
el único que no pide otra cuenta: está en el mismo repositorio que el código. Lo sirve bajo
`/mental-place/`, no en la raíz, así que `vite.config.ts` lee la base de `BASE_PATH` y el flujo de
despliegue la exporta. En local sigue siendo `/`, de modo que los e2e y `npm run preview` no se
enteran. El router cuelga de `import.meta.env.BASE_URL`; nada construye rutas con `/` a pelo.

Pages es estático: no hay servidor, así que no hay push desde el servidor. Los avisos son del
dispositivo (D-076). Si algún día hace falta push, cambiar de sitio es mover `BASE_PATH` a `/`.

### D-076 · Service worker propio para avisar con la app cerrada

El generado (`generateSW`) solo sabe de caché. Con `injectManifest` el service worker es
`src/sw.ts` y además escucha `periodicsync`: cuenta los vencidos leyendo IndexedDB **en crudo**
—sin Dexie, para no meter media app en el worker— y muestra la notificación. `notificationclick`
enfoca la pestaña abierta o abre `/sesion`.

Honestamente: esto solo lo dispara Chrome o Edge, y únicamente si la app está **instalada** y se
usa con frecuencia; el navegador decide el momento y las doce horas de `minInterval` son una
petición, no una promesa. En iOS no existe. El aviso al abrir la app (D-056) sigue siendo el
camino que funciona en todas partes, y la pantalla Datos dice cuál de los dos está activo en vez
de prometer lo que no hay.

`src/sw.ts` se comprueba con su propio `tsconfig.sw.json`: usa la librería `WebWorker`, que no
convive con `DOM` en el mismo proyecto. La etiqueta de la sincronización vive en
`periodic-tag.ts`, importado por el worker y por la app, porque si se separan el aviso deja de
llegar sin que nada falle.

### D-077 · La columna pegada es un patrón de escritorio y hay que apagarla

Cinco pantallas tenían la misma avería: `.insp__map`, `.pae__map`, `.lce__map` y `.bst__map` con
`position: sticky`, y una media query que al llegar al móvil solo colapsaba la rejilla a una
columna. Un elemento sticky se desplaza **sobre** el contenido que le sigue, así que en el teléfono
el cuerpo se montaba encima del panel: el Inspector tapaba 760 px del detalle, y
`elementFromPoint` sobre el título del detalle devolvía el `<svg>` del cuerpo. Es exactamente lo
que se veía al tocar un punto.

Ahora el sticky vive dentro de `@media (min-width: 901px)`, el mismo umbral en el que la rejilla
tiene dos columnas. La regla general: **nada se queda pegado cuando el diseño es de una columna**.

### D-078 · El alto del mapa viaja como variable CSS, no como estilo en línea

`BodyMap` escribía `style={{ maxHeight }}`, y un estilo en línea gana a cualquier media query. Por
eso seis pantallas tenían un cuerpo de 62dvh que el móvil no podía bajar; D-073 lo había parcheado
solo en la sesión, pasando `maxHeight="none"`. Ahora el componente escribe
`--bodymap-max` y `.bodymap` hace `max-height: var(--bodymap-max, none)`: cada pantalla puede
bajarlo en el teléfono con una regla normal, sin tocar el componente.

### D-079 · En el teléfono la vista sigue a la fase de la tarjeta

Medido en un Pixel 5 (727 px de alto): cabecera 122 + cuerpo 224 + escena 70 + pregunta 51 = 467
px antes de la respuesta, con los calificadores pegados abajo a 638. No caben a la vez el cuerpo
grande, la pregunta y una respuesta larga, y fingir que sí dejaba 199 px para leer una tabla de
patrones.

Dos movimientos, los dos del prototipo `PalacioApp.dc.html`:

1. **El cuerpo manda al recordar y se encoge al leer** (`stageH = isContent ? 200 : 440`): 48dvh
   mientras se intenta recordar —es el ejercicio— y 19dvh al revelar el contenido.
2. **«Revelar» baja a la barra de acción**, el mismo hueco que luego ocupan los cuatro
   calificadores, para que el pulgar no se mueva. Dentro de la tarjeta caía 68 px por debajo del
   borde de la pantalla.
3. Al revelar, la vista **aterriza en la tarjeta**: la pregunta arriba, la respuesta debajo y el
   cuerpo a un dedo de distancia. Al pasar a la tarjeta siguiente vuelve al cuerpo.

Sitio para leer: **199 px → 637 px**. El alto del mapa no se anima: además de reflujo por
fotograma, el desplazamiento automático se calculaba sobre la posición vieja y se pasaba 211 px.

### D-080 · `matchMedia` y `scrollIntoView` se doblan en el setup de los tests

jsdom no trae ninguno de los dos, y ahora las pantallas los usan para decidir si están en una
columna. El doble de `matchMedia` resuelve `min-width`/`max-width` contra `window.innerWidth`, así
que un test simula un teléfono cambiando ese valor; `revealPanel` además comprueba que existan
antes de usarlos, como en D-069.

### D-081 · `1fr` no es `minmax(0, 1fr)`, y el `clip` del shell lo tapaba

La avería que el usuario veía en su iPhone. `grid-template-columns: 1fr` significa
`minmax(auto, 1fr)`: el mínimo de la pista es el **min-content** del contenido, así que al
colapsar a una columna la pista crecía **más que la pantalla** —439,8 px en un iPhone de 390— y el
texto se iba por la derecha. Y `.shell { overflow-x: clip }`, puesto como «red de seguridad»,
hacía justo lo contrario de ayudar: **recortaba en silencio** lo que sobraba, sin barra de
desplazamiento y sin forma de llegar a ello.

Doce rejillas con el mismo defecto, ahora `minmax(0, 1fr)`. La `clip` se queda —evita el rebote
horizontal de iOS— pero ya no puede esconder nada: el e2e mide contra la **caja del shell**, no
contra el documento, porque `document.scrollWidth` nunca crecía y por eso todas las mediciones
anteriores decían «desborda 0».

### D-082 · `viewport-fit=cover` sin zonas seguras recorta el iPhone

`index.html` pedía `viewport-fit=cover` —la maquetación llega hasta el borde físico— pero el CSS
no usaba `env(safe-area-inset-*)` en ningún sitio. En un iPhone con notch eso mete el contenido
bajo las esquinas redondeadas y el indicador de inicio. Ahora el relleno del shell y las tres
barras inferiores (`.ses__act`, `.ses__grades`, `.sheet`) suman el inset. Donde no hay notch,
`env()` vale 0 y nada cambia. Se añade también `-webkit-text-size-adjust: 100%`, porque Safari
agranda el texto por su cuenta y desborda los contenedores.

### D-083 · Una tabla de 5+ columnas se apila en el teléfono

De los «minimal pairs» (8 columnas) solo se veía el **54 %**: 270 px había que arrastrarlos fila
por fila, y 42 de los 44 ítems de fonética tienen una. Arrastrar no es leer. En pantalla estrecha
cada fila pasa a ser una ficha y cada celda lleva delante el nombre de su columna; la cabecera
sigue ahí para el lector de pantalla. Lo decide el **número de columnas**, no de qué va la tabla
(regla 2: nada de contenido en la app). Una celda que solo repite el nombre de su columna —la
«vs.»— se convierte en la raya que separa las dos mitades que se contrastan.

### D-084 · La cámara del cuerpo se acota al lienzo

Centrar el punto sin acotar dejaba la caja medio vacía: con el punto 1 —lo alto de la cabeza— la
traslación salía **positiva** y empujaba el cuerpo hacia abajo, con media pantalla en negro en la
sesión del teléfono. Acotada, el lienzo escalado siempre cubre la vista.

### D-085 · Una barra pegada acaba tapando lo que tiene encima

`position: sticky; bottom: 0` desplaza el elemento **sobre** el contenido anterior, igual que
D-077 pero por abajo: «Revelar» se montaba sobre el texto de la tarjeta. En el teléfono las dos
barras de acción son ahora **fijas y opacas**, y `.ses` reserva su hueco, de modo que no pueden
tapar nada y todo se alcanza desplazando.

### D-086 · Los e2e corren también en Safari

Nada de lo anterior se vio en seis auditorías porque Playwright solo corría Chromium: Safari en
iOS no es Chrome con otra piel. Hay un tercer proyecto, `movil-iphone` (WebKit, iPhone 13), y los
tests de teléfono miran el prefijo `movil`, así que corren en los dos. Requiere
`npx playwright install webkit`.

### D-087 · La tabla de patrones se lee por grupos, no como rejilla

En las tablas de patrones el patrón solo viene en la **primera fila** de cada
grupo; las siguientes dejan `#` y `Patrón` vacíos. Pintada como rejilla y apilada en el teléfono
(D-083), cada palabra de continuación quedaba suelta, **sin el patrón al que pertenece**: en un
repaso eso confunde más que no enseñar nada.

Ahora una tabla con esa forma se pinta por grupos: el patrón es una cabecera con su número y
cuántas palabras trae, y sus filas cuelgan de él. Tres reglas, todas por la **forma** de los datos
y no por lo que signifiquen (regla 2):

1. **Agrupa** la primera columna que viene llena en la fila inicial y vacía en alguna posterior;
   se cuentan solo las del principio, porque un hueco en medio es un dato que falta.
2. **Encabeza la fila** la columna que más veces contiene el fragmento entrecomillado del
   encabezado (`"ee"` → `ee`): es la palabra por la que esas filas están juntas. Detrás van las
   columnas técnicas —la transcripción, que es una anotación corta— y cierra la traducción.
3. **Se resalta** el fragmento dentro de esa palabra, con fondo, negrita y subrayado, nunca solo
   color. Solo ahí: marcarlo también en la traducción («Golp**ea**r» por «ea») confunde, que es
   justo lo que había que evitar.

Los «minimal pairs» no tienen celdas vacías, así que siguen con el apilado de D-083.

### D-088 · La lupa: los puntos amontonados, separados

15 de los 45 puntos del cuerpo de fonética caen en la cabeza; sus áreas táctiles se solapaban y
elegir uno concreto era cuestión de suerte (quedó anotado como pendiente en dos auditorías). El
diseño lo resuelve con un círculo muy ampliado sobre esa zona, con el número y el estado de cada
punto (`PalacioApp.dc.html`).

Dos cosas se **calculan**, no se escriben: el recorte sale de los puntos marcados como `dense`
—ninguna coordenada de la cabeza vive en la app— y el diámetro de los pines sale de la distancia
real al vecino más cercano (el 80 % de la mediana), porque agrandarlos a ojo los volvía a
amontonar, que es justo lo que la lupa viene a evitar.

De paso aparecieron dos defectos de `BodyMap`: el número y el área táctil mínima se medían contra
el **lienzo entero**, de modo que en un recorte los pines salían grandes pero mudos y con 19 px de
área; ahora se miden sobre el ancho **visible**. Y un punto que aparece dos veces en la pantalla
—el cuerpo y su lupa— necesita nombres accesibles distintos, o el lector de pantalla lo lee
duplicado: los de la lupa llevan el prefijo «Lupa».

En el editor de palacio la lupa no se enseña en modo Puntos: ahí se toca el cuerpo entero para
crear y arrastrar, y un segundo mapa estorbaría.

### D-089 · `anyOf` con muchas claves es catastrófico

La Fase 6 daba por buena una app con 500 puntos y 10 000 ítems **sin haberlo medido nunca**. Al
medirlo, cuatro de seis comprobaciones se agotaban a los 20 segundos. El culpable:

| Paso                                       | Tiempo        |
| ------------------------------------------ | ------------- |
| Importar 10 000 ítems                      | 344 ms        |
| `items.where('locusId').anyOf(500 claves)` | **53 479 ms** |
| `items.toArray()` (10 000)                 | 69 ms         |
| `reviewStates.bulkGet(10 000)`             | 75 ms         |

`anyOf` recorre el índice **una vez por clave**: leer la tabla entera y filtrar en memoria es 775
veces más rápido. Cambiado en los tres sitios que lo usaban con el conjunto de puntos de un palacio
o de una zona (`collectCandidates`, `statusByLocus`, `listItemsByPalace`); para un solo punto sigue
mandando el índice, que es una búsqueda directa.

Dos consultas por ítem más, del mismo estilo: `collectCandidates` pedía el estado de repaso uno a
uno (10 000 viajes seguidos) y la Biblioteca hacía lo mismo al abrirse. Las dos pasan a `bulkGet`.

El fichero de medida (`tests/escala.test.ts`) pasó de **102 s con cuatro agotados a 2,3 s con los
seis en verde**. Los topes son generosos —esto corre en cualquier máquina— pero cortan de raíz
cualquier vuelta a un O(n²).

### D-090 · El Palacio 2 llega con sus 100 puntos y sin contenido inventado

El contrato (§10.1) pide «100 elementos en 2 cuerpos de 50 puntos», y el traspaso de diseño ya los
trae: `LOCI` y `LOCI_C2` de `pc-data.js` son dos cuerpos de 50 puntos con su nombre anatómico, su
posición, su zona y **el elemento de gramática que le toca a cada uno**. `seed/gramatica_c1.json`
los traduce a las entidades del contrato, con la plantilla «Gramática C1» de §10.6.

Lo que **no** se hace es inventar el contenido. Se sondeó el PDF de origen (`100 grammar
news.pdf`): de sus 2 millones de caracteres solo aparecen **34 de los 100** elementos como sección
con título propio; el resto vive en tablas de plan y referencias cruzadas. No da para una ingesta
fiable como la del Word de fonética, y escribir yo las reglas de gramática sería contenido
inventado presentado como material de estudio.

Así que cada punto queda con su **ancla** —el nombre del elemento, que es lo que hay que recordar
ahí— y **sin ítems**: nada entra en la cola de repaso mientras no haya algo de verdad que
estudiar. El contenido entra después a mano o con un import parcial de solo `items` con
`locusRef`, que es justo para lo que se construyó (Fase 3).

Como `casas.json`, no se carga al arrancar: son dos palacios que quizá no quieras. Se importa
desde «Datos».

### D-091 · Avisar en el minuto del repaso: qué se puede y qué no

El usuario pidió un aviso **por cada repetición**, a su hora. La restricción que manda es que usa
un **iPhone**, así que esto es lo que hay de verdad:

| Alternativa                   | iPhone                    | Hora exacta             | Servidor |
| ----------------------------- | ------------------------- | ----------------------- | -------- |
| Aviso al abrir la app (D-056) | sí                        | no, solo al abrir       | no       |
| `periodicsync` (D-076)        | **no existe en iOS**      | no, decide el navegador | no       |
| Notification Triggers         | **nunca pasó de prueba**  | sí                      | no       |
| **Temporizador en la app**    | sí, con la app viva       | **sí**                  | no       |
| **Calendario (.ics)**         | sí                        | **sí**                  | no       |
| Web Push (VAPID)              | sí, iOS 16.4+ e instalada | sí                      | **sí**   |

Se añaden las dos que no piden servidor:

1. **Temporizador** (`features/notifications/timer.ts`): mientras la app siga viva se arma un
   `setTimeout` para el **siguiente vencimiento** y el aviso salta en su minuto, nombrando el
   punto («Toca repasar: Pelo / Cabello»). Cubre de verdad los checkpoints cortos de R10 —10 min,
   1 h—, que son los que se pierden si solo se mira al abrir. Se trocea en tramos de 10 minutos
   porque un `setTimeout` largo se desvía al suspenderse el equipo, y se **rearma al calificar**,
   porque entonces la cola cambia.
2. **Calendario** (`io/ics.ts`): cada repaso, un evento con alarma a su hora. Es la única forma de
   que un iPhone avise **con la app cerrada** sin montar nada. Es una **foto**: al estudiar cambian
   las fechas y hay que volver a exportar; la pantalla lo dice, porque prometer otra cosa sería
   engañar. Los repasos se agrupan por instante, ya que R10 redondea los intervalos de un día o más
   a la hora de inicio y decenas de ítems caen en el mismo minuto.

Lo que **no** se hace sin tu visto bueno: **Web Push**. Es lo único que avisa a la hora exacta con
la app cerrada en iPhone, pero necesita un servidor que envíe (claves VAPID, dónde guardar las
suscripciones y un cron que dispare). GitHub Pages es estático, así que supondría otro servicio y
un cambio de stack — y eso se pregunta antes (regla 6).

### D-092 · El servidor de avisos guarda fechas, no contenido

Elegido Cloudflare Workers para el push (D-091). La decisión que de verdad importa no es el
proveedor sino **qué se le cuenta**:

- La app manda la suscripción y **una lista de marcas de tiempo**: cuándo le tocan los próximos
  repasos. Nada más. Ni los puntos, ni los ítems, ni cuántos son, ni de qué van.
- El cron mira cada cinco minutos qué fechas han llegado y manda un push **sin contenido**.
- El service worker del teléfono recibe ese golpecito, cuenta los vencidos **leyendo su propia
  base** y escribe el aviso. Ya lo hacía para `periodicsync` (D-076), así que no hubo que inventar
  nada.

Dos ventajas de una sola decisión: lo que estudias no sale del móvil, y nos ahorramos cifrar la
carga útil (`aes128gcm`), que es la parte fea y frágil del protocolo de Web Push.

El resto son cuidados normales: la clave privada es un secreto de Wrangler y nunca el repositorio;
una suscripción que el navegador tira (404/410) se borra; un dispositivo sin señales en 90 días se
olvida; y las fechas ya avisadas se quitan para no repetir el aviso en el siguiente cron.

Las fechas se reenvían **al calificar**, porque entonces la cola cambia y las que el servidor tenía
dejan de valer. Se mandan las de 45 días por delante: si no abres la app en mes y medio, el aviso
se para —y entonces el problema no es el aviso—.

### D-093 · La precisión del aviso la decidía una cuota de KV

El cron iba cada cinco minutos, y eso no era una elección de diseño sino una consecuencia: el
reparto recorría los dispositivos con `AVISOS.list()`, y el plan gratuito de Workers KV da **100
000 lecturas al día pero solo 1 000 `list`**. Un cron al minuto son 1 440 ejecuciones: no cabía.

El problema es que el **primer checkpoint de R10 son 10 minutos**. Esperar cinco es la mitad del
intervalo —un aviso que llega a los 14 minutos de un repaso de 10 ya no es el aviso que se pidió—.

Se cambia el `list` por un **índice en una sola clave**: las claves de los dispositivos viven en
una entrada de KV que el cron lee con un `get`. 1 440 lecturas al día frente a las 100 000 del
plan, así que el cron puede ir **al minuto** y el aviso llega con menos de 60 s de retraso.

De paso, dos escrituras que se iban de las manos:

- El índice solo se reescribe cuando de verdad cambia (un dispositivo nuevo o uno que se cae), no
  en cada pasada.
- El cliente reenvía sus fechas **como mucho una vez por minuto**. Se llamaba al calificar, y una
  sesión de 200 tarjetas eran 200 escrituras: la quinta parte de la cuota diaria para decir casi
  lo mismo. Al activar el aviso sí se fuerza, porque es lo que el usuario acaba de pedir.

Cuentas del día, con un dispositivo: 1 440 lecturas (cron) + ~50 escrituras (sesiones y avisos),
contra 100 000 y 1 000. Sobra sitio.

### D-094 · La accesibilidad se audita a mano, y luego se vigila con tests

La Fase 6 pedía accesibilidad y solo estaba hecha la mitad: el teclado (espacio revela, 1–4
califican) sí, el lector de pantalla nunca se había mirado.

Auditado con `npm run audit:a11y`, que no añade ninguna dependencia: comprueba a mano lo que de
verdad deja a alguien fuera, que es un puñado corto de cosas y todas medibles. Las once rutas
salieron limpias —ningún interactivo sin nombre, ningún control sin etiqueta, ningún salto de
encabezado, ningún `aria-labelledby` colgando— y los diez pares de contraste pasan el 4,5:1 en los
dos temas; el más justo es `--text-3` en claro, 4,69:1.

Se dejó por escrito lo que **no** cubre: no es axe. Cubre nombres accesibles, etiquetas de
formulario, orden de encabezados, referencias ARIA, landmarks, `alt` y contraste. No cubre orden
de foco, trampas de teclado ni roles mal aplicados. Añadir axe sería una dependencia nueva y eso
se pregunta antes (regla 6); con la auditoría en limpio, no parecía el momento.

De la propia auditoría salió una lección que ya conocíamos: la primera versión **no supo leer
`#fff`** y dejó un par de contraste sin medir, pero lo imprimía como si no pasara nada. Un dato
que falta esconde problemas igual que el `overflow-x: clip` de D-081, así que ahora «sin medir»
cuenta como fallo, tanto en el script como en el test.

Las cinco comprobaciones son ya e2e: lo que importa no es que hoy esté limpio, sino que no pueda
dejar de estarlo sin que salte.
