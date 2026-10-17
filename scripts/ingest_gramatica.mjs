/**
 * Genera `seed/gramatica_c1.json`: el Palacio 2 del contrato §10.1, «100
 * elementos en 2 cuerpos de 50 puntos».
 *
 * Los dos cuerpos ya están en el traspaso de diseño (`LOCI` y `LOCI_C2` de
 * `pc-data.js`): sus 100 puntos traen nombre anatómico, posición, zona y **el
 * elemento de gramática que le toca a cada uno**. Aquí solo se traducen a las
 * entidades del contrato.
 *
 * **No se inventa contenido.** Cada punto queda con su ancla —el nombre del
 * elemento— y sin ítems: nada entra en la cola de repaso hasta que haya algo
 * que estudiar de verdad. El contenido se añade luego a mano o con un import
 * parcial de solo `items` usando `locusRef` («Cuerpo 1 · Gramática C1 · L8»).
 *
 * Tampoco se carga al arrancar: se importa desde la pantalla «Datos».
 *
 * Uso:  node scripts/ingest_gramatica.mjs [--out seed/gramatica_c1.json]
 */
import { writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { LOCI, LOCI_C2, ZONES, ZONES_C2 } from '../design_handoff_palacio_corporal/pc-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(ROOT, 'seed', 'gramatica_c1.json');

const AHORA = new Date().toISOString();

/**
 * La plantilla «Gramática C1» del contrato §10.6, campo por campo.
 *
 * Viaja como dato dentro de la semilla, no en `src/`: la app no sabe de
 * gramática (regla 2).
 */
const PLANTILLA = {
  id: 'tpl-gramatica-c1',
  name: 'Gramática C1',
  description: 'Un elemento de gramática inglesa, con su regla, su forma y sus trampas.',
  fields: [
    { key: 'rule', label: 'Regla en una frase', kind: 'text' },
    { key: 'definition', label: 'Definición', kind: 'longtext' },
    { key: 'formula', label: 'Fórmula', kind: 'text', hint: 'S + have/has + participio' },
    { key: 'conjugation', label: 'Tabla de conjugación', kind: 'table' },
    {
      key: 'parts',
      label: 'Sub-elementos',
      kind: 'object',
      hint: 'pieza · función · apreciación · ejemplo · dato interesante',
    },
    { key: 'examples', label: 'Ejemplos EN/ES', kind: 'list' },
    { key: 'typicalError', label: 'Error típico', kind: 'text' },
    { key: 'exceptions', label: 'Excepciones', kind: 'list' },
    { key: 'confusion', label: 'Confusión común', kind: 'text' },
    { key: 'tip', label: 'Tip', kind: 'text' },
    { key: 'links', label: 'Conexiones', kind: 'list' },
  ],
  blockOrder: ['text', 'note', 'table', 'list', 'bilingual', 'error'],
};

/**
 * Los diez valores de `PalaceStyle`, copiados de `PALACE_STYLE_DEFAULTS`
 * (`src/domain/types.ts`). Inventarlos no vale: el import los valida y
 * `line: 'medium'` —que no existe— tumbaba la semilla entera.
 */
const STYLE = {
  accent: 'cabeza',
  draw: 'atlas',
  skin: 'neutral',
  hair: 'none',
  hairColor: 'var(--line-2)',
  facial: 'none',
  glasses: false,
  detail: 'full',
  vol: 'shade',
  line: 'fine',
};

/** Un cuerpo: palacio, sus cinco zonas y sus cincuenta puntos. */
function cuerpo(slug, nombre, zonas, loci, orden) {
  const palaceId = `pal-${slug}`;
  const palace = {
    id: palaceId,
    name: nombre,
    kind: 'body_both',
    color: 'torso',
    order: orden,
    style: STYLE,
    createdAt: AHORA,
    updatedAt: AHORA,
  };

  const zones = zonas.map((z, i) => ({
    id: `zon-${slug}-${z.id}`,
    palaceId,
    name: z.name,
    color: z.id,
    order: i,
  }));

  const puntos = loci.map((l) => {
    const locus = {
      id: `loc-${slug}-${String(l.n).padStart(2, '0')}`,
      palaceId,
      zoneId: `zon-${slug}-${l.zone}`,
      routeNo: l.n,
      partName: l.name,
      side: l.side ?? 'front',
      pos: { x: l.x, y: l.y },
      // El ancla dice qué va aquí; el contenido se añade después.
      anchor: { text: l.item },
    };
    if (l.dense) locus.dense = true;
    return locus;
  });

  return { palace, zones, puntos };
}

const c1 = cuerpo('gram-c1', 'Cuerpo 1 · Gramática C1', ZONES, LOCI, 1);
const c2 = cuerpo('gram-c2', 'Cuerpo 2 · Gramática C1', ZONES_C2, LOCI_C2, 2);

const bundle = {
  version: 1,
  palaces: [c1.palace, c2.palace],
  zones: [...c1.zones, ...c2.zones],
  loci: [...c1.puntos, ...c2.puntos],
  sceneObjects: [],
  items: [],
  decks: [
    {
      id: 'dck-gramatica-c1',
      name: 'Gramática C1 · 100 elementos',
      description: 'Los 100 elementos del plan, repartidos en dos cuerpos de 50 puntos.',
      templateId: PLANTILLA.id,
      scheduleId: 'sch-r10',
    },
  ],
  templates: [PLANTILLA],
  schedules: [],
};

writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

const kb = Math.round(statSync(out).size / 1024);
console.log(`Escrito ${relative(ROOT, out)} — ${kb} kB`);
console.log(`  ${bundle.palaces.length} palacios · ${bundle.zones.length} zonas · ${bundle.loci.length} puntos`);
console.log(`  ${bundle.items.length} ítems (el contenido se añade después)`);
console.log(`  plantilla «${PLANTILLA.name}» con ${PLANTILLA.fields.length} campos`);
const sinAncla = bundle.loci.filter((l) => !l.anchor?.text).length;
console.log(sinAncla === 0 ? '  todos los puntos dicen qué elemento les toca' : `  ¡${sinAncla} sin elemento!`);
