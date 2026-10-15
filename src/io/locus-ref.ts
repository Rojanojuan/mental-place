import type { ID, Locus, Palace } from '@/domain/types';

/**
 * Catálogo de lo que ya hay en la base, para resolver referencias por texto.
 * Se pasa como dato: así esta resolución es pura y se puede probar sola.
 */
export interface Catalog {
  palaces: Pick<Palace, 'id' | 'name'>[];
  loci: Pick<Locus, 'id' | 'palaceId' | 'routeNo' | 'partName' | 'room'>[];
}

export type RefResult =
  | { ok: true; locusId: ID }
  | { ok: false; reason: 'not-found' | 'ambiguous'; candidates?: string[] };

/** Minúsculas sin acentos ni espacios dobles: para comparar nombres escritos a mano. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Separadores admitidos entre palacio y punto: «·», «|», «/» o «>». */
const SEPARATOR = /\s*[·|/>]\s*/;

/**
 * Resuelve una referencia de texto a un punto concreto.
 *
 * Formas que entiende, todas sin distinguir mayúsculas ni acentos:
 * - `«Cuerpo 1 · L8»` — palacio y número de ruta con la L delante
 * - `«Casa familiar · 37»` — palacio y número de ruta
 * - `«Cuerpo 1 · Hombro derecho»` — palacio y nombre de la parte o del mueble
 * - `«Hombro derecho»` — solo el nombre, si no hay dos iguales en toda la base
 *
 * Nunca adivina: si el nombre aparece en dos palacios devuelve `ambiguous` con
 * los candidatos, para que la vista previa lo muestre y el usuario decida.
 */
export function resolveLocusRef(ref: string, catalog: Catalog): RefResult {
  const trimmed = ref.trim();
  if (trimmed === '') return { ok: false, reason: 'not-found' };

  const parts = trimmed.split(SEPARATOR).filter((part) => part.trim() !== '');

  // El nombre de un palacio puede llevar el separador dentro («Cuerpo 1 ·
  // Verbal + Nominal»), así que se prueba el prefijo más largo que encaje con
  // un palacio y el resto identifica el punto.
  for (let take = parts.length - 1; take >= 1; take -= 1) {
    const name = parts.slice(0, take).join(' · ');
    const palace = catalog.palaces.find((candidate) => fold(candidate.name) === fold(name));
    if (!palace) continue;
    const pool = catalog.loci.filter((locus) => locus.palaceId === palace.id);
    const result = matchInPool(parts.slice(take).join(' · '), pool);
    if (result.ok || result.reason === 'ambiguous') return result;
  }

  // Sin palacio por delante: el nombre tiene que ser único en toda la base.
  return matchInPool(trimmed, catalog.loci);
}

function matchInPool(needle: string, pool: Catalog['loci']): RefResult {
  const target = needle.trim();

  // ¿Número de ruta, con o sin «L» delante?
  const asNumber = /^L?\s*(\d+)$/i.exec(target);
  if (asNumber) {
    const routeNo = Number(asNumber[1]);
    const hits = pool.filter((locus) => locus.routeNo === routeNo);
    return decide(hits);
  }

  const folded = fold(target);
  // Nombre exacto de la parte o del mueble.
  let hits = pool.filter((locus) => fold(locus.partName) === folded);
  if (hits.length === 0) {
    // «Lámpara de pie · Salón»: el diseño desambigua repitiendo la habitación.
    hits = pool.filter(
      (locus) => locus.room !== undefined && fold(`${locus.partName} · ${locus.room}`) === folded,
    );
  }
  if (hits.length === 0) {
    // Último recurso: coincidencia por prefijo, para nombres compuestos como
    // «Tibia / Espinilla / Canilla» escritos a medias.
    hits = pool.filter((locus) => fold(locus.partName).startsWith(folded));
  }
  return decide(hits);
}

function decide(hits: Catalog['loci']): RefResult {
  const first = hits[0];
  if (!first) return { ok: false, reason: 'not-found' };
  if (hits.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
      candidates: hits.map((locus) => `${locus.partName} (#${String(locus.routeNo)})`),
    };
  }
  return { ok: true, locusId: first.id };
}
