# Handoff de diseño

Estado: **diseño entregado** en `design_handoff_palacio_corporal/` (alta fidelidad, sistema
Nocturne + `pc-tokens.css`). Este documento ya no sirve para pedir componentes al diseño, sino para
dos cosas:

1. **Inventario de componentes**: nombres, props y estados que la UI va a implementar.
2. **Diferencias contrato ↔ diseño**: qué manda en cada caso.

> Regla 8 de `CLAUDE.md`: `design_handoff_palacio_corporal/` es de **solo lectura**.
> Los `.dc.html` son prototipos, no código a portar. `support.js` no se porta.

---

## 1. Qué se ha tomado ya del traspaso (Fase 0)

| Archivo del traspaso     | Destino en el proyecto      | Notas                                     |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `pc-tokens.css`          | `src/design/tokens.css`     | Sin cambios. Temas en `[data-pc-theme]`.  |
| `silueta/body-front.svg` | `src/design/body-front.svg` | viewBox `0 0 200 480`. No tocar contorno. |
| `silueta/body-back.svg`  | `src/design/body-back.svg`  | Ídem.                                     |

Pendientes de portar (Fase 1–4): `pc-data.js` → `seed/` (LOCI, LOCI_C2, ZONES, ZONES_C2, STD45,
STD45_ZONES); `pc-houses.js` → generador de los 10 planos; los `.dc.html` → componentes React.

---

## 2. Inventario de componentes

Nombres según `PROMPT_MEJORAS.md` §7. Todos son de presentación: reciben props y emiten callbacks;
no leen la base de datos ni el motor de repaso.

### `BodyMap`

El mapa: cuerpo, plano de casa o imagen propia, con pines, halos de zona, ruta y cámara.

| Prop            | Tipo                                              | Notas                                             |
| --------------- | ------------------------------------------------- | ------------------------------------------------- |
| `palace`        | `Palace`                                          | Determina si pinta silueta, plano o imagen.       |
| `loci`          | `Locus[]`                                         | Posiciones normalizadas 0–1.                      |
| `statusByLocus` | `Record<ID, LocusState>`                          | Color y patrón de cada pin.                       |
| `zones`         | `Zone[]`                                          | Halos y tinte al 9 %.                             |
| `side`          | `'front' \| 'back' \| 'both'`                     | En `both`, hueco del 22 % del ancho de un cuerpo. |
| `appearance`    | `PalaceStyle`                                     | Ver §3.2.                                         |
| `focusId`       | `ID \| null`                                      | Cámara: zoom al punto, 700 ms `--ease-camera`.    |
| `zoom`          | `number`                                          | Pines contra-escalados para mantener tamaño.      |
| `selectedIds`   | `ID[]`                                            | Modo zonas / lazo.                                |
| `showRoute`     | `boolean`                                         | Línea de ruta por `routeNo`.                      |
| `onLocusTap`    | `(id: ID) => void`                                |                                                   |
| `onCanvasTap`   | `(pos: { x: number; y: number }) => void`         | Crear punto.                                      |
| `onLocusDrag`   | `(id: ID, pos: { x: number; y: number }) => void` | Mover (umbral ≥ 4 px).                            |
| `onLocusHold`   | `(id: ID) => void`                                | Long-press 450 ms → editar/borrar.                |

Llena su contenedor con `ResizeObserver` y respeta el aspect ratio.

### `LocusPin`

| Prop       | Tipo         | Notas                                                |
| ---------- | ------------ | ---------------------------------------------------- |
| `state`    | `LocusState` | Color = token de §4.                                 |
| `routeNo`  | `number`     | Inter 500 tabular; se oculta si el pin mide < 13 px. |
| `size`     | `number`     | Cuerpo: 5,2 % del alto, entre 11 y 28 px. Ver §3.4.  |
| `dense`    | `boolean`    | ≈ 2,6 % del alto, mínimo 8 px.                       |
| `focused`  | `boolean`    | Anillo de acento + escala 1,15.                      |
| `selected` | `boolean`    |                                                      |

**Nunca solo color**: `due` → halo pulsante `pc-pulse` 1800 ms · `suspended` → rayado ·
`mastered` → estrella. Área táctil ≥ 28 px (44 px cuando cabe).

### Pantallas

| Componente     | Prototipo              | Props principales                                                                         |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `PalacioApp`   | `PalacioApp.dc.html`   | Hoy + sesión + resumen (móvil). Saludo, racha, CTA «Repasar ahora (N)», previsión 7 días. |
| `PalaceEditor` | `PalaceEditor.dc.html` | `palace`, `appearance`, `mode: 'points'\|'zones'\|'route'`, `theme`.                      |
| `BodyStyler`   | `BodyStyler.dc.html`   | `bodies`, `style`, `onChange` — crear/duplicar cuerpos.                                   |
| `Casas`        | `Casas.dc.html`        | `house`, `rooms`, `mode: 'explore'\|'edit'\|'quick'`.                                     |
| `PalaceWalk`   | `PalaceWalk.dc.html`   | `loci` en orden de ruta, `index`, filtro por zona.                                        |
| `LocusDetail`  | `LocusDetail.dc.html`  | `locus`, `sceneObjects` (≤ 5, reordenables), `items`, `history`.                          |
| `ItemEditor`   | `ItemEditor.dc.html`   | `item`, `template`, `blocks`, asignación palacio → zona → punto.                          |
| `Library`      | `Library.dc.html`      | `items`, `filters`, selección en lote, bandeja «Sin asignar».                             |
| `Stats`        | `Stats.dc.html`        | Previsión 30 d, calor diario, retención por zona, cuerpo de calor.                        |
| `Schedules`    | `Schedules.dc.html`    | `schedules`, `presets`, editor de intervalos con línea de tiempo.                         |
| `ImportExport` | `ImportExport.dc.html` | Vista previa JSON + conflictos, mapeo CSV, copia de seguridad.                            |
| `Onboarding`   | `Onboarding.dc.html`   | 4 pasos: qué es · elegir cuerpo · elegir horario · primer repaso.                         |
| `Desktop`      | `Desktop.dc.html`      | Cortes ≥ 1280 / 960–1279 / < 960.                                                         |

### Estado de sesión (no es un componente, es el store)

`queue`, `index`, `phase: 'point' | 'scene' | 'content'`, `rating`, `proposedDueAt`, `manual`,
`startedAt`.

---

## 3. Diferencias contrato ↔ diseño

### 3.1 `Palace.kind` vs `Palace.type` — **manda el contrato**

`PROMPT_MEJORAS.md` §4 habla de `Palace.type`; los tipos del contrato (§5) usan `kind`.
→ **El campo se llama `kind`.** Se le añade el valor `custom_plan`:
`'body_front' | 'body_back' | 'body_both' | 'custom_image' | 'custom_plan'`.

### 3.2 Campos nuevos en `Palace` — **[AMPLÍA CONTRATO]**, manda el diseño

```ts
interface PalaceStyle {
  accent: 'cabeza' | 'hombros' | 'torso' | 'brazos' | 'piernas'; // default 'cabeza'
  draw: 'atlas' | 'lapiz' | 'neon'; // default 'atlas'
  skin: 'neutral' | 'porcelana' | 'arena' | 'miel' | 'canela' | 'ebano' | 'plano';
  hair: 'none' | 'buzz' | 'short' | 'curly' | 'tail' | 'bun' | 'long';
  hairColor: string; // color CSS; default 'var(--line-2)'
  facial: 'none' | 'stache' | 'beard';
  glasses: boolean; // default false
  detail: 'min' | 'med' | 'full'; // default 'full'
  vol: 'shade' | 'flat'; // default 'shade'
  line: 'fine' | 'bold'; // default 'fine'
}
```

Además `Palace.aspect?: number`, `Palace.planData?: { svg: string; w: number; h: number }`,
`Palace.rooms?: Room[]` con
`Room = { label, x, y, w, h, zone, lx, ly, sub }`.
En palacios sin cuerpo solo aplican `accent` y `line`.

### 3.3 Campos nuevos en `Locus` — **[AMPLÍA CONTRATO]**

`room?: string` (nombre de habitación, en planos) y `dense?: boolean` (cabeza, manos).

### 3.4 Nomenclatura de `pc-data.js` → dominio

Los prototipos usan nombres cortos. Al portar la semilla:

| Prototipo | Dominio                                        |
| --------- | ---------------------------------------------- |
| `n`       | `routeNo`                                      |
| `name`    | `partName`                                     |
| `zone`    | `zoneId`                                       |
| `x`, `y`  | `pos.x`, `pos.y`                               |
| `state`   | derivado, no se guarda (sale de `ReviewState`) |
| `item`    | un `Item` aparte                               |

`state` e `item` en `pc-data.js` son **datos de ejemplo del prototipo**: en la app el estado se
calcula con `itemStatus()`.

### 3.5 `dayStartHour`: 7 vs 8 — **manda el diseño**

El contrato pone «p. ej. 7» como ejemplo; el diseño fija la hora preferida en **8:00** y así lo
muestran todas las pantallas. → **default 8**, editable en «Horarios de repaso».

### 3.6 Hoja de próximo repaso: «Aceptar» es la acción principal — **concreta el contrato**

El contrato exige que el usuario **siempre** pueda ajustar el próximo repaso. El diseño lo concreta:
por defecto se muestra la propuesta del horario («Próximo repaso: jueves 16, 8:00 a. m.
(etapa 3/10)») con **Aceptar** como acción principal, y todo lo demás (atajos, fecha y hora
exactas, saltar a etapa) bajo **«Avanzado»**. Preferencia de usuario: mostrar la hoja siempre /
solo al tocar el intervalo / nunca.

### 3.7 `Zone.color`: texto libre vs 5 tokens — **manda el diseño en la UI**

El contrato define `Zone.color: string`. El diseño usa 5 paletas fijas (`--zone-cabeza`,
`--zone-hombros`, `--zone-torso`, `--zone-brazos`, `--zone-piernas`).
→ El campo sigue siendo `string`, pero la UI guarda ahí **el nombre del token** (`'cabeza'`,
`'torso'`, …), no un hex. Así el tema claro/oscuro sigue funcionando.

### 3.8 Plantillas de palacio: el diseño añade dos

El contrato solo menciona los 2 cuerpos de 50 puntos. El diseño añade **«Estándar 45»** (fonética,
orden de ruta fijo dado por el usuario, no reordenable) y **10 casas** de ≥ 130 puntos con reglas
de ruta no negociables (`PROMPT_MEJORAS.md` §4.2). Al crear un palacio el usuario elige:
«Gramática 50» · «Estándar 45» · «Vacío» · «Plano de casa / Imagen propia».

### 3.9 bis · El reparto de sonidos de `pc-data.js` era dato de ejemplo

El array `PH` de `pc-data.js` asigna los 45 sonidos a las partes del cuerpo **en un orden distinto**
al de `documentación/Guia_Fonetica 2026.docx`: el prototipo pone `/iː/` en el pelo y `/ɪ/` en la
frente, mientras el documento del usuario pone `/j/` en el pelo y `/iː/` en la frente.

→ **Manda el documento del usuario.** `PH` era contenido de relleno para que el prototipo tuviera
algo que pintar. Lo que sí se toma de `pc-data.js`, y es correcto, es la **geometría**: `STD45`
(coordenadas, lado y puntos densos de los 45 loci, con nombres idénticos a los del Word),
`STD45_ZONES` y el estilo `f45` de `BODIES`.

Lo mismo vale para los campos `state` e `item` de cada locus en `pc-data.js`: en la app el estado
se calcula desde `ReviewState` y el contenido vive en `Item`.

### 3.9 ter · Los nombres de zona no cuadran del todo con el reparto real

`STD45_ZONES` llama a la primera zona «Cabeza · Vocales», pero con el reparto del documento el
punto 1 (Pelo) es `/j/`, una aproximante. Las cinco zonas se conservan tal cual —son la
agrupación geométrica del diseño—; renombrarlas es decisión del usuario.

### 3.9 Import/export: campos extra

`palaces` añade `rooms`, `planData`, `style`; `loci` añade `room`, `dense`.
`locusRef` acepta además «Casa familiar · 37» y nombres de mueble.

---

## 4. Tokens de estado (ya disponibles en `src/design/tokens.css`)

`src/design/states.ts` los expone tipados:

| Estado      | Token               | Etiqueta ES |
| ----------- | ------------------- | ----------- |
| `empty`     | `--state-empty`     | Sin ítems   |
| `new`       | `--state-new`       | Nuevo       |
| `learning`  | `--state-learning`  | Aprendiendo |
| `due`       | `--state-due`       | Vencido     |
| `review`    | `--state-review`    | Al día      |
| `mastered`  | `--state-mastered`  | Dominado    |
| `suspended` | `--state-suspended` | Pausado     |

Otros tokens que la UI debe respetar: `--state-edge` (borde del pin en tema claro), `--body-line`,
`--body-fill`, `--hit` (44 px), `--pin` (28 px), `--radius-sheet` (20 px), `--dur-camera` (700 ms),
`--dur-reveal` (420 ms), `--dur-pulse` (1800 ms), `--ease-out`, `--ease-camera`.

**Regla Nocturne:** los botones primarios van en **contorno de acento** (1–1,5 px) sobre
`--accent-tint`, nunca en relleno sólido. Foco: `outline 2px var(--accent)`, offset 2 px.
