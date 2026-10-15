# Semillas

Datos de ejemplo y contenido del usuario, en el **formato JSON v1 público** del contrato (§5).
**Nada de esto es código de la app**: se importan por el mismo camino que cualquier copia de
seguridad, y la app no puede depender de su contenido.

## Archivos

| Archivo             | Contenido                                                                                        | Estado      |
| ------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `fonetica45.json`   | Palacio «Fonética · Estándar 45»: 45 puntos, 44 ítems, plantilla «Fonética», mazo y horario R10. | ✅ generado |
| `gramatica_c1.json` | Los 100 elementos C1 como ítems de la plantilla «Gramática C1», en 2 cuerpos de 50 puntos.       | pendiente   |

## `fonetica45.json` se genera, no se edita

Sale de `documentación/Guia_Fonetica 2026.docx` con:

```bash
npm run seed:fonetica
```

El conversor es `scripts/ingest_fonetica.py` y escribe además
`docs/INGESTA_FONETICA.md`, con los conteos y las anomalías encontradas en el Word.
Si se corrige el documento (por ejemplo, para añadir la sección **34 · TOBILLO /s/**, que falta),
se vuelve a correr y la semilla se regenera. **Editar el JSON a mano se pierde en la siguiente
pasada.**

La geometría (coordenadas, lados, puntos densos y zonas) no está en el Word: sale de `STD45` y
`STD45_ZONES` en `design_handoff_palacio_corporal/pc-data.js`. Ver `docs/HANDOFF_DISENO.md` §3.9
bis para saber qué se toma de ahí y qué no.

## El palacio de gramática

`documentación/100 grammar news.pdf` (218 páginas) es el material de origen. Falta que el usuario
describa la estructura que quiere, como hizo con la fonética: qué va en el detalle de cada punto y
cómo se reparten los 100 elementos entre los dos cuerpos.
