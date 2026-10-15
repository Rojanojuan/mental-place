# PROMPT PARA CLAUDE CODE — Mejoras acordadas en diseño (Palacio Corporal)

> Pega este bloque junto al CONTRATO COMPARTIDO. Recoge todo lo que se decidió durante la fase de diseño y que **amplía o concreta** el contrato. Si algo choca con el contrato, manda el contrato salvo en los puntos marcados como **[AMPLÍA CONTRATO]**, que son cambios aceptados por el usuario.

Implementa la app siguiendo los archivos de referencia HTML de esta carpeta (son prototipos, no código de producción). Recréalos en el stack del proyecto. Todos los nombres de componentes coinciden con las entidades del contrato: `Palace`, `Zone`, `Locus`, `SceneObject`, `Item`, `Deck`, `Template`, `Schedule`, `ReviewState`, `ReviewLog`.

---

## 1. Plantillas de palacio corporal (3 incluidas)

### 1.1 «Gramática 50» — Cuerpo 1 y Cuerpo 2 (100 elementos C1)
- Las **mismas 50 partes** en los dos cuerpos, mismo orden de ruta, mismas coordenadas. Solo cambian zonas (nombres) e ítems.
- Cuerpo 1 · Verbal + Nominal (zonas: Cabeza · Presentes, Hombros · Perfectos, …). Cuerpo 2 · Oración + Discurso (Cabeza · Adjetivos y adverbios, Hombros · Relativas, …).
- Datos exactos: `pc-data.js` → `LOCI`, `LOCI_C2`, `ZONES`, `ZONES_C2`. Cada locus: `{id, n, name, zone, x, y, side, dense, state, item}`.

### 1.2 «Estándar 45» — Fonética **[AMPLÍA CONTRATO]**
- Orden de ruta **fijo** dado por el usuario (no reordenar): 1 Pelo/Cabello · 2 Frente · 3 Cejas · 4 Pestañas · 5 Ojos · 6 Nariz · 7 Bigote · 8 Labios · 9 Dientes · 10 Lengua · 11 Garganta · 12 Mentón · 13 Mejillas · 14 Sien · 15 Orejas · 16 Cuello/Tráquea · 17 Hombros · 18 Axila · 19 Bíceps · 20 Codo · 21 Antebrazo · 22 Muñeca · 23 Nudillos · 24 Uñas · 25 Palma de la mano · 26 Pecho · 27 Costillas · 28 Ombligo · 29 Barriga/Abdomen · 30 Genitales · 31 Muslo · 32 Rodilla · 33 Tibia/Espinilla/Canilla · 34 Tobillo · 35 Empeine · 36 Dedo pequeño del pie/Meñique · 37 Planta del pie · 38 Talón · 39 Pantorrilla · 40 Nalgas · 41 Cadera · 42 Cintura · 43 Columna · 44 Espalda · 45 Nuca.
- Datos: `pc-data.js` → `STD45`, `STD45_ZONES`. Recorrido cabeza → pies → espalda (frontal 1–37, posterior 38–45 aprox.; ver `side`).
- Al crear un palacio el usuario elige plantilla base: «Gramática 50», «Estándar 45», «Vacío» o «Plano de casa / Imagen propia».

### 1.3 Puntos densos (cabeza, manos)
- Campo `dense: true` en el locus. En vista general se dibujan más pequeños (≈ 2,6 % del alto del cuerpo, mínimo 8 px) y sin número si quedan < 13 px. Al hacer zoom (sesión, lupa) recuperan número. Área táctil siempre ≥ 28 px (44 px cuando cabe).

---

## 2. Apariencia del cuerpo personalizable **[AMPLÍA CONTRATO]**
Añadir a `Palace` el campo `style` (objeto). Valores y defaults:

| clave | valores | default |
|---|---|---|
| `accent` | `cabeza` `hombros` `torso` `brazos` `piernas` (token `--zone-*`) — tiñe contorno y chip | `cabeza` |
| `draw` | `atlas` (sombreado difuminado) · `lapiz` (sombras rayadas) · `neon` (contorno con resplandor) | `atlas` |
| `skin` | `neutral` `porcelana` `arena` `miel` `canela` `ebano` `plano` | `neutral` |
| `hair` | `none` `buzz` `short` `curly` `tail` `bun` `long` | `none` |
| `hairColor` | color CSS (7 swatches en `PalaceEditor`) | `var(--line-2)` |
| `facial` | `none` `stache` `beard` | `none` |
| `glasses` | boolean | `false` |
| `detail` | `min` (solo contorno) · `med` (rasgos + articulaciones) · `full` (+ músculos) | `full` |
| `vol` | `shade` · `flat` | `shade` |
| `line` | `fine` · `bold` | `fine` |

- Ejemplos: Cuerpo 1 = arena, corto, bigote · Cuerpo 2 = canela, largo, gafas, lápiz · Fonética 45 = plano, rizado, detalle medio, neón.
- Edición: hoja inferior «Apariencia del cuerpo» (botón pincel en el editor de palacio) y pantalla «Mis cuerpos» (`BodyStyler.dc.html`). Cambios en vivo; el cuerpo queda visible arriba mientras se edita.
- Para palacios sin cuerpo solo aplican `accent` y `line`.

## 3. Silueta SVG
- `silueta/body-front.svg` y `silueta/body-back.svg`, viewBox `0 0 200 480`. Posición de un locus: `{x: px/200, y: py/480}` (0–1).
- Capas (en este orden): orejas → contorno (con filtro de volumen interior) → brillo radial → sombreado anatómico (formas difuminadas recortadas al contorno) → borde de luz → rasgos faciales → articulaciones → músculos → vello facial/gafas → cabello.
- Frontal: cejas, ojos con iris y reflejo, pestañas, nariz, labios con tinte, mentón, mejillas, sien, tráquea, clavículas, pectorales, esternón, costillas, abdomen, ombligo, oblicuos, ingle, deltoides, bíceps, codo, antebrazo, muñeca, dedos, pulgar, nudillos, uñas, muslo, rodilla, tibia, tobillos, dedos del pie.
- Posterior: nuca, trapecio, escápulas, columna, dorsales, lumbar con hoyuelos, nalgas, corva, pantorrillas, talón, codo, nudillos, uñas.
- Sombra de suelo bajo los pies cuando `vol = shade`.
- **No cambiar el contorno exterior**: las coordenadas de las plantillas dependen de él.

## 4. Palacios que no son cuerpo **[AMPLÍA CONTRATO]**
`Palace.type` admite además `custom_plan` (plano de casa generado) — `custom_image` ya existía.
- `custom_image`: el usuario sube una foto/ilustración; los puntos se colocan encima con `{x, y}` 0–1. Ejemplo «Ruta al trabajo · Conectores».
- `custom_plan`: plano arquitectónico vectorial. Campos extra en `Palace`: `aspect`, `planData {svg, w, h}`, `rooms [{label, x, y, w, h, zone, lx, ly, sub}]`. Cada `Locus` añade `room` (nombre de habitación).

### 4.1 Diez casas incluidas (≥130 puntos c/u) — `pc-houses.js`
Casa familiar (136) · Piso urbano (133) · Casa de campo (132) · Ático con terraza (133) · Villa mediterránea (133) · Casa de la abuela (131) · Loft industrial (134) · Cabaña de montaña (133) · Casa de playa (133) · Mansión victoriana (165). 12–15 habitaciones, ~25 tipos de habitación, ~75 tipos de mueble. **Cada mueble = un locus.**

### 4.2 Reglas de la ruta en casas (no negociables)
1. Punto 1 = **Puerta principal**.
2. Habitaciones en **serpentina**: fila superior izquierda → derecha, la siguiente derecha → izquierda, etc.
3. Siempre hay **puerta entre habitaciones consecutivas** de la ruta → la ruta nunca salta ni se cruza.
4. Dentro de cada habitación: **sentido horario desde la puerta de entrada**, muebles pegados a la pared, y al final el mueble central (mesa, isla, coche, billar).
5. Zonas = grupos de habitaciones: Zona de día (`cabeza`), Cocina y servicio (`torso`), Zona de noche (`hombros`), Trabajo y ocio (`brazos`), Exterior (`piernas`).
6. Nombres repetidos se desambiguan: «Lámpara de pie · Salón».

### 4.3 Realismo del plano
Muros de doble línea con relleno (exteriores 7,4 u rayados, interiores 4,6 u), puertas con hoja y arco punteado, ventanas con doble vidrio en fachadas > 70 u, suelos con textura (madera, baldosa, tarima, hormigón), tinte de zona al 9 %, sombra suave bajo los muebles, alfombras, nombre de habitación + medidas («11,6 × 7,5 m», 1 u = 5 cm).

### 4.4 Edición e ingreso de contenido en casas (`Casas.dc.html`)
- **Explorar**: tocar mueble → zoom 2,2× y panel lateral con: nombre del mueble, *Qué guardas aquí* (título, frente, reverso), estado, ancla (emoji + texto), objetos de escena (≤ 5, aviso si más), notas. Botones ←/→, «Guardar y siguiente», borrar.
- **Mover y añadir**: arrastrar punto = mover; tocar hueco dentro de una habitación = crear punto (se inserta al final de esa habitación en la ruta; la numeración se recalcula).
- **Ingreso rápido**: textarea, una línea por elemento, formato `título | respuesta`. Se asigna en orden de ruta desde el punto N; opción «Saltar puntos ya ocupados». Mensajes: «N líneas → puntos a–b», «k sin sitio», «No hay puntos vacíos desde el N · desmarca…». Botón desactivado (opacidad 0,45) si no hay destino.
- Barra de progreso «X de N puntos con contenido» + botón «Primer vacío». Cada habitación muestra `llenos/total` y su rango de puntos.
- En el prototipo se persiste en `localStorage` (`pc-houses-v1`); en la app real → `Locus` + `Item` + `SceneObject` en la base de datos.
- Este mismo flujo (panel por punto + ingreso rápido) debe existir también para palacios corporales.

## 5. Tamaño de puntos y responsivo
- Cuerpo: tamaño del punto = 5,2 % del alto renderizado del cuerpo, entre 11 y 28 px.
- Planos: `0,3 × zoom × √(área / nº puntos)`, entre 9 px y el máximo.
- < 13 px → punto sin número (solo color + patrón de estado).
- El mapa (`BodyMap`) llena su contenedor (ResizeObserver) y respeta el aspect ratio; cuerpo frontal + posterior con hueco del 22 % del ancho de un cuerpo.
- Escritorio: ≥ 1280 px → menú completo + 3 columnas; 960–1279 → menú de iconos y paneles estrechos; < 960 (tablet) → una columna con el mapa arriba.

## 6. Repaso: próximos repasos estandarizados + modo avanzado **[CONCRETA CONTRATO]**
- Por defecto el próximo repaso **sale del horario del usuario** (R10 o el preset configurado en «Horarios de repaso»). Tras calificar se muestra «Próximo repaso: jueves 16, 8:00 a. m. (etapa 3/10)» y **Aceptar** es la acción principal; el resto queda bajo **«Avanzado»** (atajos +10 min · Esta noche · Mañana · +3 d · +1 sem · +1 mes, elegir fecha y hora, saltar a etapa).
- Preferencia: mostrar la hoja siempre / solo al tocar el intervalo / nunca (aceptar automáticamente).
- Fechas manuales → `ReviewLog.manual = true`.

## 7. Componentes (nombres para código)
`BodyMap` (mapa de cuerpo/plano/imagen con pins, halos de zona, ruta, cámara), `LocusPin` (todos los estados; vencido pulsa, suspendido rayado, dominado estrella), `PalaceEditor`, `BodyStyler`, `Casas` (visor/editor de planos), `PalaceWalk` (recorrido), `LocusDetail`, `ItemEditor`, `Library`, `Stats`, `Schedules`, `ImportExport`, `Onboarding`, `PalacioApp` (Hoy + sesión + resumen, móvil), `Desktop` (escritorio responsivo).

## 8. Import/export
Mantener el JSON versionado del contrato y añadir `rooms`, `planData`, `style` en `palaces` y `room`, `dense` en `loci`. Import parcial por `locusRef` = «Casa familiar · 37» o por nombre de mueble/parte.
