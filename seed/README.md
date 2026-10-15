# Semillas

Datos de ejemplo. **Nada de esto es código de la app**: son archivos JSON que se importan con el
mismo formato público de `src/io/` (contrato §5). La app no puede depender de su contenido.

## Archivos previstos

| Archivo             | Contenido                                                       | Fase |
| ------------------- | --------------------------------------------------------------- | ---- |
| `cuerpo1.json`      | Palacio «Cuerpo 1 · Verbal + Nominal», 50 puntos y sus zonas.   | 2    |
| `cuerpo2.json`      | Palacio «Cuerpo 2 · Oración + Discurso», mismas 50 partes.      | 2    |
| `estandar45.json`   | Plantilla «Estándar 45» (fonética), orden de ruta fijo.         | 2    |
| `gramatica_c1.json` | Los 100 elementos C1 como ítems de la plantilla «Gramática C1». | 3    |

## Origen de los datos

Los tres primeros se portan de `design_handoff_palacio_corporal/pc-data.js`
(`LOCI`, `ZONES`, `LOCI_C2`, `ZONES_C2`, `STD45`, `STD45_ZONES`), renombrando campos según
`docs/HANDOFF_DISENO.md` §3.4. Los 10 planos de casa no se guardan aquí: se generan por código
(`pc-houses.js`).

## Falta un archivo de entrada

`gramatica_c1.json` se construye en la Fase 3 a partir de **`elementos_c1_base.json`**, que todavía
no está en el repositorio. Cada elemento se asigna al palacio indicado en su campo `palacio`.
Cuando llegue, ponlo en esta carpeta.
