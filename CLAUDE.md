# CLAUDE.md — Palacio Corporal

> Instrucciones permanentes del proyecto. Secciones 1–9: cómo trabajar.
> Sección 10: CONTRATO COMPARTIDO (fuente única de verdad).
> El traspaso de diseño ya está entregado en `design_handoff_palacio_corporal/`;
> **lee `design_handoff_palacio_corporal/PROMPT_MEJORAS.md`**: amplía el contrato.

## 1. Tu rol

Eres el ingeniero principal de **Palacio Corporal**: una app de palacio de la memoria sobre un
cuerpo personalizable, con repaso espaciado por checkpoints (preset R10) y fijación manual del
próximo repaso. Construyes el dominio, el motor de repaso, el almacenamiento, la importación y la
lógica de pantallas, y recreas en el stack del proyecto los prototipos HTML del traspaso de diseño.

## 2. Reglas de trabajo

1. **El contrato manda** (§10). Si algo no está definido, elige lo más simple, anótalo en
   `docs/DECISIONES.md` y sigue. Donde `PROMPT_MEJORAS.md` esté marcado **[AMPLÍA CONTRATO]**,
   manda `PROMPT_MEJORAS.md`.
2. **Contenido genérico.** Nada de gramática codificada en la app. Los 100 elementos C1 son solo
   un archivo de semilla en `seed/`.
3. **Primero la lógica y los tests, luego la UI.** El motor de repaso es puro (sin I/O) y tiene
   cobertura ≥ 90 % (umbral forzado en `vite.config.ts`).
4. **UI desacoplada del diseño.** Los componentes de presentación leen tokens de
   `src/design/tokens.css` (variables CSS del traspaso: `--state-due`, `--zone-torso`, …).
5. **Commits pequeños** con mensajes claros (`feat(srs): …`, `test(srs): …`). Al terminar cada
   fase, actualiza `docs/PROGRESO.md` con lo hecho, lo pendiente y lo que espera del diseño.
6. **Pregunta antes de** agregar dependencias pesadas, cambiar el stack o tocar el esquema de
   datos ya migrado.
7. Todo en **TypeScript estricto**. Sin `any` salvo en adaptadores de importación, y documentado.
8. **No modifiques `design_handoff_palacio_corporal/`**: es referencia de solo lectura.

## 3. Stack (fijado; cámbialo solo si el usuario lo pide)

- **React 18 + TypeScript + Vite**, como **PWA** instalable (offline-first, móvil y escritorio).
- Estado: **Zustand**. Rutas: **React Router**.
- Persistencia local: **IndexedDB con Dexie**, migraciones versionadas. Nube: fase futura, detrás
  de una interfaz `SyncAdapter`.
- Fechas: **date-fns** (zona horaria local; guarda en ISO UTC).
- Cuerpo y puntos: **SVG** con coordenadas normalizadas 0–1 (viewBox `0 0 200 480`); gestos con
  Pointer Events (tocar, arrastrar, mantener presionado, pinch-zoom).
- Validación de import/export: **Zod**.
- Tests: **Vitest** + Testing Library; e2e con **Playwright** (fase 5).
- Notificaciones de repaso: Notifications API + service worker (fase 6).
- Iconos: **Phosphor Icons**. Tipografía: Inter (UI) + IBM Plex Mono (fórmulas, números, tablas).

## 4. Estructura de carpetas

```
src/
  domain/          # tipos y entidades del contrato (sin dependencias)
  srs/             # motor de repaso puro: schedules, grade(), nextDue(), queue()
  db/              # Dexie: esquema, migraciones, repositorios
  io/              # import/export JSON y CSV + esquemas Zod
  providers/       # ContentProvider (IA futura, p. ej. Gemini) — solo interfaz + mock
  state/           # stores de Zustand
  features/        # today, session, walk, palace-editor, locus, item-editor,
                   # library, stats, schedules, import-export, onboarding
  components/      # componentes de presentación (BodyMap, LocusPin, …)
  design/          # tokens.css, base.css, body-front.svg, body-back.svg, assets.ts, states.ts
seed/              # cuerpo1.json, cuerpo2.json, estandar45.json, gramatica_c1.json
docs/              # DECISIONES.md, PROGRESO.md, HANDOFF_DISENO.md
tests/             # setup y pruebas de integración
design_handoff_palacio_corporal/   # prototipos de diseño (SOLO LECTURA)
```

## 5. Tipos base

`src/domain/types.ts` (escrito en la Fase 0, verbatim del contrato). La Fase 1 lo amplía con
`Deck`, `Template` y los campos añadidos en diseño: `Palace.style`, `Palace.planData`,
`Palace.rooms`, `Palace.aspect`, `Locus.room`, `Locus.dense`, y el tipo `custom_plan`.

## 6. Motor de repaso (`src/srs/`) — especificación exacta

- `PRESETS`: **R10** = [10 min, 1 d, 3 d, 7 d, 14 d, 30 d, 60 d, 90 d, 180 d, 365 d]
  (en minutos: `[10, 1440, 4320, 10080, 20160, 43200, 86400, 129600, 259200, 525600]`);
  **Rápido examen** (1 h, 1 d, 2 d, 4 d, 7 d, 14 d); **Clásico** 1-3-7-14-30;
  **Adaptativo** (SM-2: ease inicial 2,5, mín. 1,3); **Personalizado**.
  Hora preferida por defecto: **8:00** (`dayStartHour`).
- `grade(state, schedule, grade, now) → { state, proposedDueAt, log }`, en modo checkpoints:
  - `again`: según `againAction` → etapa 1 (reset), −1 o −2 (mín. 1). `lapses++`, `streak = 0`.
    Próximo repaso = intervalo de la nueva etapa (en R10, 10 min).
  - `hard`: misma etapa; intervalo = intervalo de la etapa × `hardFactor` (0,5), con el mínimo de
    `minInterval`.
  - `good`: etapa + 1.
  - `easy`: etapa + `easySkip` (2).
  - Si la etapa supera el número de intervalos → estado `mastered` (`dueAt` = último intervalo,
    repaso opcional).
  - Los intervalos ≥ 1 día se redondean a `dayStartHour` local del día resultante.
- `override(state, schedule, target, now)`, con
  `target = { at: Date } | { addInterval: Interval } | { stage: number }`. Fija el próximo repaso a
  mano y marca `manual = true` en el log. Si viene `stage`, recalcula `dueAt` desde ese checkpoint.
- `previewIntervals(state, schedule, now)` → texto de cada botón («10 min», «1 d»…) para la UI.
- `itemStatus(state, now)` → `LocusState`. `locusStatus(items)` → el estado más urgente
  (due > learning > new > review > mastered > empty).
- `buildQueue({ scope: 'today'|'locus'|'zone'|'palace'|'walk', … }, now)`: vencidos primero (por
  `dueAt`), luego nuevos hasta el límite diario, desempate por `priority`. En `walk`, orden por
  `routeNo` sin filtrar por vencimiento.
- **Tests obligatorios:** cada calificación en cada etapa, reset/back1/back2, mastered, redondeo a
  la hora de inicio del día, overrides (fecha exacta, +intervalo, etapa), cambios de horario DST,
  límites diarios, orden de la cola y estado del punto agregado.

## 7. Fases (ejecuta en orden; al terminar cada una, informa y espera «sigue»)

- **Fase 0 · Andamiaje** ✅ — Vite + TS estricto + ESLint/Prettier + Vitest + PWA; carpetas;
  `docs/`; tokens y siluetas **reales** del traspaso en `src/design/`.
- **Fase 1 · Dominio + motor SRS + tests** (§6). Sin UI.
- **Fase 2 · Base de datos:** esquema Dexie v1, repositorios CRUD, transacciones (borrar un punto
  → sus ítems pasan a «sin asignar», no se borran), semilla de ejemplo.
- **Fase 3 · Import/Export:** esquemas Zod del JSON v1 (+ `rooms`, `planData`, `style` en
  `palaces`; `room`, `dense` en `loci`), import parcial con `locusRef` («Cuerpo 1 · L8», «Casa
  familiar · 37» o nombre de parte/mueble), vista previa de cambios (dry-run), CSV con mapeo de
  columnas y export completo. Convierte `seed/gramatica_c1.json` en ítems de la plantilla
  «Gramática C1», asignados según su campo `palacio`.
- **Fase 4 · Pantallas:** Hoy, Sesión (señalar → escena → contenido → calificar → hoja de próximo
  repaso), Recorrido, Editor de palacio, Casas, Mis cuerpos, Detalle del punto, Editor de ítem,
  Biblioteca, Horarios, Estadísticas, Importar/exportar, Onboarding. Recrea los `.dc.html` del
  traspaso con los nombres de componente de `PROMPT_MEJORAS.md` §7.
- **Fase 5 · Cierre del diseño:** repasa pantalla por pantalla contra los prototipos, registra las
  diferencias contrato/diseño en `docs/HANDOFF_DISENO.md` y añade los e2e de Playwright del flujo
  de repaso.
- **Fase 6 · Pulido:** notificaciones de vencidos, offline completo, accesibilidad (espacio =
  revelar, 1–4 = calificar; lector de pantalla), rendimiento (500+ puntos, 10 000 ítems) y copia de
  seguridad automática.
- **Fase 7 (futura) · `ContentProvider` de IA:** `generateItem(topic, template)` /
  `enrichItem(item)` con un mock; el adaptador real se conecta con la clave del usuario, nunca en
  el código.

## 8. Trabajo con el diseño

- `docs/HANDOFF_DISENO.md` lista los componentes, sus props y sus estados, y cualquier diferencia
  entre contrato y diseño.
- Si el usuario pega una pantalla nueva, adapta los componentes de presentación sin tocar
  `domain/`, `srs/` ni `db/`.
- Nunca bloquees el avance por falta de diseño.

## 9. Definición de terminado (por fase)

`npm run check` en verde (typecheck + lint + tests), `npm run build` sin errores,
`docs/PROGRESO.md` actualizado y una demo manual descrita en 3–5 pasos.

---

## 10. CONTRATO COMPARTIDO

### 10.1 Concepto

App para memorizar **cualquier contenido** usando el método de loci sobre un **cuerpo humano
personalizable** (u otra imagen: casa, ruta, edificio). Cada **punto (locus)** guarda uno o varios
**ítems**. El usuario repasa con **repetición espaciada por checkpoints** (preset «R10») y puede
**fijar manualmente el próximo repaso** cada vez que estudia.

El primer caso de uso es gramática inglesa C1 (100 elementos en 2 cuerpos de 50 puntos), pero
**nada en la app puede depender de ese contenido**: todo es genérico y configurable.

### 10.2 Entidades (nombres exactos)

| Entidad         | Campos clave                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Palace**      | id, nombre, tipo `body_front` · `body_back` · `body_both` · `custom_image` (+ `custom_plan`), imagen/silueta, color, orden, creado/actualizado                                    |
| **Zone**        | id, palaceId, nombre («Cabeza · Presentes»), color, orden                                                                                                                         |
| **Locus**       | id, palaceId, zoneId, número de ruta (1…n), nombre de la parte, lado `front`/`back`, posición `{x, y}` normalizada 0–1, ancla (texto + imagen/emoji), notas                       |
| **SceneObject** | id, locusId, texto, representa, emoji/imagen, orden (máx. 5 recomendado)                                                                                                          |
| **Item**        | id, locusId (o null si está sin asignar), deckId, título, frente, reverso, bloques, etiquetas, campos personalizados, plantillaId, prioridad, origen (`manual` · `import` · `ai`) |
| **Deck**        | id, nombre, descripción, plantillaId por defecto, scheduleId por defecto                                                                                                          |
| **Template**    | id, nombre, lista de campos y bloques                                                                                                                                             |
| **Schedule**    | id, nombre, modo `checkpoints` · `adaptive`, intervalos, reglas de calificación                                                                                                   |
| **ReviewState** | itemId, scheduleId, etapa, dueAt, última revisión, facilidad, lapsos, racha, estado                                                                                               |
| **ReviewLog**   | id, itemId, fecha, calificación, etapa antes/después, intervalo aplicado, dueAt, manual, duración en segundos                                                                     |

### 10.3 Estados y colores semánticos

| Estado      | Significado                   | Token                        |
| ----------- | ----------------------------- | ---------------------------- |
| `empty`     | Punto sin ítems               | `--state-empty`              |
| `new`       | Tiene ítem nunca estudiado    | `--state-new`                |
| `learning`  | En etapas 1–3                 | `--state-learning`           |
| `due`       | Repaso vencido o para hoy     | `--state-due` (pulsante)     |
| `review`    | Al día, en etapas intermedias | `--state-review`             |
| `mastered`  | Etapa final alcanzada         | `--state-mastered`           |
| `suspended` | Pausado por el usuario        | `--state-suspended` (rayado) |

El estado del **punto** = el estado más urgente de sus ítems
(due > learning > new > review > mastered > empty).
**Nunca solo color**: vencido pulsa, suspendido rayado, dominado estrella.

### 10.4 Motor de repaso

**Preset R10** (10 checkpoints, editable): 10 min · 1 d · 3 d · 7 d · 14 d · 30 d · 60 d · 90 d ·
180 d · 365 d. Al superar la etapa 10 → `mastered` (repaso opcional anual).
Otros presets: «Rápido examen» (1 h, 1 d, 2 d, 4 d, 7 d, 14 d), «Clásico 1-3-7-14-30»,
«Adaptativo (tipo SM-2)» y «Personalizado».

**Calificación** (modo checkpoints): **Otra vez** → etapa 1 (configurable: −1, −2 o reiniciar),
cuenta lapso · **Difícil** → misma etapa, intervalo × 0,5 (mín. 10 min) · **Bien** → +1 etapa ·
**Fácil** → +2 etapas.

**Fijar el próximo repaso a mano** (requisito clave): tras calificar, el usuario **siempre** ve la
fecha y hora propuestas y puede aceptarlas (por defecto), elegir un atajo (+10 min, esta noche,
mañana, +3 d, +1 sem, +1 mes), elegir fecha y hora exactas, o saltar a una etapa concreta. Las
fechas manuales se guardan con `manual = true`. El horario sigue desde la etapa elegida.

**Unidades de repaso**: por ítem, por punto, por zona, por palacio, como **recorrido** (todos los
puntos en orden de ruta) y la «cola de hoy» (todo lo vencido, por urgencia y luego por prioridad).

**Flujo de una tarjeta**: cuerpo con el punto señalado (pulso + zoom) y su nombre/ancla → el
usuario intenta recordar → **Revelar**: objetos de escena y luego el contenido → califica (4
botones) → ve el próximo repaso propuesto → puede ajustarlo → siguiente. ≤ 3 toques por tarjeta.

### 10.5 Importación / exportación

JSON versionado:

```json
{
  "version": 1,
  "palaces": [],
  "zones": [],
  "loci": [],
  "sceneObjects": [],
  "items": [],
  "decks": [],
  "templates": [],
  "schedules": []
}
```

Import parcial permitido (p. ej. solo `items` con `locusRef`). Exportación completa como copia de
seguridad. (Futuro) adaptador `ContentProvider` para generar o enriquecer ítems; la app no depende
de él.

### 10.6 Plantillas de ítem incluidas

1. **Libre**: título, frente, reverso, notas.
2. **Vocabulario**: palabra, traducción, ejemplo EN/ES, pronunciación, imagen.
3. **Gramática C1**: regla en una frase, definición, fórmula, tabla de conjugación, sub-elementos
   (pieza · función · apreciación · ejemplo · dato interesante), ejemplos EN/ES, error típico,
   excepciones, confusión común, tip, conexiones.
