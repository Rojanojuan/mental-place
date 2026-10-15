# Handoff: Palacio Corporal

## Overview
App de memoria espacial (método de loci) sobre un cuerpo humano personalizable, planos de casa o imágenes propias, con repaso espaciado por checkpoints (R10) y opción de fijar el próximo repaso. Mobile-first (390×844) con escritorio responsivo (1440×900). Interfaz en español.

**Lee primero `PROMPT_MEJORAS.md`**: resume todas las decisiones tomadas en diseño que amplían el contrato compartido (plantillas de 50 y 45 partes, apariencia del cuerpo, 10 casas, edición e ingreso rápido, reglas de ruta, tamaños de punto, repasos estandarizados con modo avanzado).

## About the Design Files
Los archivos de esta carpeta son **referencias de diseño hechas en HTML**: prototipos que muestran aspecto y comportamiento, no código de producción. La tarea es **recrearlos en el entorno del proyecto** (React, React Native, Flutter, SwiftUI…) con sus patrones y librerías; si aún no hay proyecto, elige el framework más adecuado (sugerencia: React + TypeScript, SVG para el mapa). Los `.dc.html` se abren directamente en el navegador (necesitan `support.js` al lado). Los datos de ejemplo y el generador de casas están en `pc-data.js` y `pc-houses.js` (ES modules, reutilizables casi tal cual).

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciado, estados e interacciones son finales. Base visual: sistema **Nocturne** (`_ds/…/styles.css`) + tokens propios en `pc-tokens.css`.

## Screens / Views
Todas tienen variante clara y oscura (`data-pc-theme="light|dark"` en la raíz).

| Archivo | Pantalla | Propósito |
|---|---|---|
| `Palacio Corporal.dc.html` | Lienzo maestro | Todas las pantallas lado a lado, por secciones numeradas (11a casas, 10a lugares, 9a apariencia, 8a responsivo, palacios, estándar 45, componentes, tokens…). Punto de entrada. |
| `PalacioApp.dc.html` | Hoy · Sesión · Resumen (móvil) | Saludo, racha, mapa compacto con vencidos por zona, CTA «Repasar ahora (N)», previsión 7 días. Sesión en 3 fases (Señalar → Escena → Contenido), 4 botones de calificación con intervalo, hoja de próximo repaso, resumen con mini-cuerpo antes/después. Lupa para puntos densos. |
| `PalaceEditor.dc.html` | Editor de palacio | Modos Puntos / Zonas / Ruta; tocar = crear, arrastrar = mover, mantener = editar/borrar; lazo; lista sincronizada; chips para cambiar de palacio; hoja «Apariencia». Props: `palace`, `appearance`, `mode`, `theme`. |
| `BodyStyler.dc.html` | Mis cuerpos | Crear/duplicar cuerpos y editar estilo (ver tabla de `style` en PROMPT_MEJORAS §2). |
| `Casas.dc.html` | Casas (escritorio) | 10 planos amueblados ≥130 puntos; explorar, editar punto, mover/añadir, ingreso rápido. |
| `PalaceWalk.dc.html` | Recorrido del palacio | Un punto por pantalla en orden de ruta, transición de cámara; revisar / calificar / saltar; filtrar por zona. |
| `LocusDetail.dc.html` | Detalle del punto | Mini-cuerpo, ancla, objetos de escena reordenables (≤5), ítems asignados, historial. |
| `ItemEditor.dc.html` | Editor de ítem | Plantillas Libre / Vocabulario / Gramática C1, bloques, asignación visual palacio→zona→punto, vista previa. Ejemplo Present Perfect con tabla de conjugación. |
| `Library.dc.html` | Biblioteca | Filtros, búsqueda, lote, bandeja «Sin asignar» con arrastre al cuerpo. |
| `Stats.dc.html` | Calendario y estadísticas | Previsión 30 d, calor diario, retención por zona, cuerpo de calor, distribución por etapa. |
| `Schedules.dc.html` | Horarios de repaso | Presets (R10, Rápido examen, Clásico, Adaptativo, Personalizado), editor de intervalos con línea de tiempo, reglas de calificación, hora preferida, límites. |
| `ImportExport.dc.html` | Importar / exportar | JSON con vista previa y conflictos, mapeo CSV, copia de seguridad. |
| `Onboarding.dc.html` | Onboarding | 4 pasos: qué es, elegir cuerpo, elegir horario, primer repaso guiado. |
| `Desktop.dc.html` | Escritorio | Hoy, Sesión, Editor de palacio, Editor de ítem, Biblioteca; responsivo (≥1280 / 960–1279 / <960). |
| `BodyMap.dc.html`, `LocusPin.dc.html` | Componentes base | Mapa (cuerpo / plano / imagen) y punto en todos sus estados. |

### Medidas clave (móvil)
- Marco 390×844. Cabecera 44–56 px; áreas táctiles ≥ 44 px.
- Botones de calificación: 4 columnas fijas abajo, alto 64 px, etiqueta 15 px/500 + intervalo 12 px mono debajo.
- Hoja inferior: radio 20 px arriba, `--shadow-lg`, animación `pc-sheet` 240 ms `--ease-out`.
- Punto: 28 px máx., borde 1,5 px, número Inter 500 tabular; foco = anillo acento + escala 1,15.

## Interactions & Behavior
- **Sesión**: Revelar → aparecen objetos de escena alrededor del punto (escalonado, `pc-in` 420 ms) → contenido. Calificar → hoja próximo repaso (Aceptar por defecto; «Avanzado» con atajos/fecha/etapa). ≤3 toques por tarjeta.
- **Cámara**: zoom al punto con `transform` 700 ms `cubic-bezier(.65,0,.25,1)`; pines contra-escalados para mantener tamaño.
- **Vencido**: halo pulsante `pc-pulse` 1800 ms infinito. Suspendido: rayado. Dominado: estrella. Nunca solo color.
- **Editor**: tap (crear), drag ≥4 px (mover), long-press 450 ms (editar/borrar), lazo en modo Zonas, dibujar ruta tocando en secuencia.
- **Casas**: ver PROMPT_MEJORAS §4.4.
- `prefers-reduced-motion`: animaciones a 1 ms y sin pulso.
- Estados vacío / cargando (shimmer `pc-shimmer`) / error / lleno en cada pantalla del lienzo maestro.

## State Management
- Entidades del contrato + campos añadidos (`Palace.style`, `Palace.planData`, `Palace.rooms`, `Locus.room`, `Locus.dense`).
- Sesión: `queue`, `index`, `phase` (point|scene|content), `rating`, `proposedDueAt`, `manual`, `startedAt`.
- Mapa: `focusId`, `zoom`, `side`, `selectedIds`, `mode`.
- Motor de repaso según contrato §4 (R10 en minutos: `[10, 1440, 4320, 10080, 20160, 43200, 86400, 129600, 259200, 525600]`), hora preferida 8:00.

## Design Tokens (`pc-tokens.css`)
**Tipografía**: Inter 400/500/600 (UI), IBM Plex Mono 400/500 (fórmulas, números, tablas).
**Espaciado**: 4 · 8 · 12 · 16 · 20 · 24 · 32 px. **Radios**: 4 · 8 · 14 · 20 (hoja) · 999. **Duraciones**: fast 140 ms · base 240 ms · reveal 420 ms · camera 700 ms · pulse 1800 ms. Easing out `cubic-bezier(.2,.8,.2,1)`, cámara `cubic-bezier(.65,0,.25,1)`.

| Token | Oscuro | Claro |
|---|---|---|
| `--bg` | #161826 | #f6f6f9 |
| `--surface` | #232532 | #ffffff |
| `--surface-2` | #2b2e3d | #eef0f6 |
| `--sunken` | #11131e | #e9ebf2 |
| `--text` / `-2` / `-3` | #e9e9ed / #b2b6ca / #8b8fa3 | #1d1f2b / #4a4e5e / #6a6e80 |
| `--accent` / `--accent-text` | #9184d9 / #d2cefd | #6457b3 / #4f4396 |
| `--body-line` | #9397ab | #6a6e80 |
| `--state-empty` | #5f6375 | #9397ab |
| `--state-new` | oklch(0.74 0.12 245) | igual |
| `--state-learning` | oklch(0.80 0.13 75) | igual |
| `--state-due` | oklch(0.72 0.16 25) | igual |
| `--state-review` | oklch(0.80 0.11 150) | igual |
| `--state-mastered` | oklch(0.83 0.13 95) | igual |
| `--state-suspended` | #75798c | #b2b6ca |
| `--zone-cabeza/hombros/torso/brazos/piernas` | oklch(0.70 0.10 h) h = 300/200/340/60/255 | oklch(0.62 0.12 h) |

Sombras oscuro: sm `0 0 0 1px #3f424d`; md `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)`; lg `0 0 0 1px #75798c, 0 16px 40px rgba(0,0,0,.65)`. Claro: ver archivo.
Botones primarios en contorno de acento (1–1,5 px) sobre `--accent-tint`, nunca relleno sólido (regla Nocturne). Foco: `outline 2px var(--accent)`, offset 2 px. Iconos: Phosphor.

## Assets
- `silueta/body-front.svg`, `silueta/body-back.svg` — silueta propia, viewBox 200×480, coordenadas normalizadas.
- Planos de casa: generados por código (`pc-houses.js`), sin imágenes.
- Iconos: Phosphor Icons (CDN `@phosphor-icons/web@2.1.1`). Emoji para objetos de escena (contenido del usuario).
- `image-slot.js`: solo para el prototipo (placeholder de imagen propia).

## Files
`*.dc.html` (pantallas y componentes), `pc-tokens.css`, `pc-data.js` (datos de ejemplo: loci, zonas, cartas, presets), `pc-houses.js` (generador de 10 casas y reglas de ruta), `silueta/`, `_ds/` (Nocturne), `support.js` (runtime del prototipo — no portar), `image-slot.js`.
