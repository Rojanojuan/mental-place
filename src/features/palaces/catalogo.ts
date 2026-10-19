import indiceUrl from '../../../seed/casas/index.json?url';
import type { Bundle, Palace, PalaceStyle } from '@/domain/types';
import { PALACE_STYLE_DEFAULTS } from '@/domain/types';
import { db, importBundle, listPalaces, newId, putPalace, stamp } from '@/db';

/**
 * El catálogo de palacios que se pueden añadir desde la app.
 *
 * Hasta ahora las casas existían pero había que **bajarse un JSON de 950 kB
 * del repositorio e importarlo a mano**: en un teléfono, impracticable. Aquí
 * se eligen y se añaden sin salir de la app (D-095).
 *
 * El índice pesa 4 kB y es lo único que se carga para enseñar la lista; la
 * casa elegida —unos 90 kB— se baja solo al añadirla.
 */

export interface CasaDelCatalogo {
  slug: string;
  name: string;
  puntos: number;
  zonas: number;
  habitaciones: number;
  kb: number;
}

/** Las casas del catálogo, sin bajar ninguna. */
export async function catalogoDeCasas(): Promise<CasaDelCatalogo[]> {
  const respuesta = await fetch(indiceUrl);
  if (!respuesta.ok)
    throw new Error(`No se pudo leer el catálogo (HTTP ${String(respuesta.status)})`);
  const datos = (await respuesta.json()) as { casas?: CasaDelCatalogo[] };
  return datos.casas ?? [];
}

/**
 * Las casas como módulos, para que Vite las emita con su hash y el navegador
 * las cachee. No se precargan: son 950 kB de palacios que quizá no quieras
 * (ver `vite.config.ts`).
 */
const ARCHIVOS = import.meta.glob<string>('../../../seed/casas/casa-*.json', {
  query: '?url',
  import: 'default',
  eager: true,
});

function urlDe(slug: string): string | undefined {
  const clave = Object.keys(ARCHIVOS).find((k) => k.endsWith(`/casa-${slug}.json`));
  return clave === undefined ? undefined : ARCHIVOS[clave];
}

/**
 * Añade una casa del catálogo.
 *
 * Si ya estaba, no se duplica: se devuelve la que hay. Un palacio repetido
 * ensucia el selector y además partiría el repaso en dos sitios.
 */
export async function anadirCasa(slug: string): Promise<Palace> {
  const url = urlDe(slug);
  if (url === undefined) throw new Error(`No existe la casa «${slug}»`);

  const yaEsta = (await listPalaces()).find((p) => p.id === `pal-${slug}`);
  if (yaEsta) return yaEsta;

  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo bajar la casa (HTTP ${String(respuesta.status)})`);
  const bundle = (await respuesta.json()) as Bundle;
  await importBundle(bundle, db);

  const anadido = (await listPalaces()).find((p) => p.id === `pal-${slug}`);
  if (!anadido) throw new Error('La casa no quedó guardada');
  return anadido;
}

/** Los cuerpos que se pueden crear, vacíos y listos para poner puntos. */
export const CUERPOS = [
  { kind: 'body_front' as const, label: 'Cuerpo · solo de frente' },
  { kind: 'body_back' as const, label: 'Cuerpo · solo de espaldas' },
  { kind: 'body_both' as const, label: 'Cuerpo · frente y espalda' },
];

/**
 * Crea un cuerpo vacío.
 *
 * Sin puntos a propósito: los pones tú en el editor, tocando el cuerpo. Un
 * palacio con puntos que no has elegido no es tu palacio.
 */
export async function crearCuerpo(
  kind: (typeof CUERPOS)[number]['kind'],
  nombre: string,
  style: PalaceStyle = PALACE_STYLE_DEFAULTS,
): Promise<Palace> {
  const palaces = await listPalaces();
  const palace: Palace = {
    id: newId('pal'),
    name: nombre.trim() === '' ? 'Cuerpo nuevo' : nombre.trim(),
    kind,
    color: 'torso',
    order: palaces.length,
    style,
    createdAt: stamp(),
    updatedAt: stamp(),
  };
  await putPalace(palace);
  return palace;
}
