/**
 * Convierte los 10 planos de casa del traspaso de diseño en `seed/casas.json`.
 *
 * El generador (`design_handoff_palacio_corporal/pc-houses.js`) ya hace el
 * trabajo geométrico: muros, puertas, habitaciones y la ruta en serpentina con
 * las reglas de `PROMPT_MEJORAS.md` §4.2. Aquí solo se traduce su forma a las
 * entidades del contrato.
 *
 * El resultado **no se carga al arrancar**: son ~1 MB para palacios que puede
 * que nunca uses. Se importa a mano desde la pantalla «Datos».
 *
 * Uso:  node scripts/ingest_casas.mjs [--out seed/casas.json]
 */
import { writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { HOUSES } from '../design_handoff_palacio_corporal/pc-houses.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(ROOT, 'seed', 'casas.json');

/** Los diez valores de `PalaceStyle`; en un plano solo cuentan `accent` y `line`. */
const STYLE_DEFAULTS = {
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

/** La fecha sale del generador, no del reloj: así el archivo es reproducible. */
const stamp = new Date(
  statSync(join(ROOT, 'design_handoff_palacio_corporal', 'pc-houses.js')).mtime,
)
  .toISOString()
  .replace(/\.\d+Z$/, 'Z');

const palaces = [];
const zones = [];
const loci = [];

HOUSES.forEach((house, index) => {
  const palaceId = `pal-${house.id}`;

  palaces.push({
    id: palaceId,
    name: house.name,
    // El generador dice `plan`; el contrato lo llama `custom_plan`.
    kind: 'custom_plan',
    style: { ...STYLE_DEFAULTS, ...house.style },
    aspect: house.aspect,
    planData: { svg: house.planData.svg, w: house.planData.w, h: house.planData.h },
    rooms: house.rooms.map((room) => {
      // Solo los campos del contrato: el generador añade `plan`, que no entra.
      const out = {
        label: room.label,
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
        zone: room.zone,
      };
      if (room.lx !== undefined) out.lx = room.lx;
      if (room.ly !== undefined) out.ly = room.ly;
      if (room.sub !== undefined) out.sub = room.sub;
      return out;
    }),
    order: 10 + index,
    createdAt: stamp,
    updatedAt: stamp,
  });

  house.zones.forEach((zone, order) => {
    zones.push({
      id: `zon-${house.id}-${zone.id}`,
      palaceId,
      name: zone.name,
      color: zone.id,
      order,
    });
  });

  house.loci.forEach((locus) => {
    loci.push({
      id: `loc-${house.id}-${String(locus.n).padStart(3, '0')}`,
      palaceId,
      zoneId: `zon-${house.id}-${locus.zone}`,
      routeNo: locus.n,
      // Cada mueble es un punto; el nombre del mueble es el nombre de la parte.
      partName: locus.name,
      side: 'front',
      pos: { x: Number(locus.x.toFixed(4)), y: Number(locus.y.toFixed(4)) },
      room: locus.room,
    });
  });
});

// Sin ítems a propósito: las casas vienen amuebladas pero vacías de contenido.
const bundle = { version: 1, palaces, zones, loci };
writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

const svgBytes = palaces.reduce((sum, p) => sum + p.planData.svg.length, 0);
console.log(`Casas:        ${String(palaces.length)}`);
console.log(`Zonas:        ${String(zones.length)}`);
console.log(`Puntos:       ${String(loci.length)}`);
console.log(`Habitaciones: ${String(palaces.reduce((sum, p) => sum + p.rooms.length, 0))}`);
console.log(`SVG de planos: ${String(Math.round(svgBytes / 1024))} kB`);
console.log(`→ ${relative(ROOT, out).replace(/\\/g, '/')}`);
