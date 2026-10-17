import type { ReactNode } from 'react';

/**
 * Tabla por grupos: la de «patrones» y cualquier otra con la misma forma.
 *
 * En estas tablas las primeras columnas solo vienen en la **primera fila** de
 * cada grupo y las siguientes las dejan vacías. Pintada como tabla corriente,
 * al apilarse en el teléfono las filas de continuación perdían su patrón y
 * quedaban palabras sueltas: justo lo que confunde en un repaso. Aquí el
 * grupo manda —es una cabecera— y sus filas cuelgan de él.
 *
 * No sabe nada del contenido: decide por la **forma** de la tabla.
 */

export interface Grupo {
  /** Valores de las columnas de agrupación: «1», «"ee"». */
  encabezado: string[];
  filas: string[][];
}

/**
 * Cuántas columnas iniciales agrupan.
 *
 * Una columna agrupa si viene llena en la primera fila y vacía en alguna
 * posterior. Se cuentan solo las del principio: en cuanto una no cumple, se
 * para, porque un hueco en medio es un dato que falta, no una agrupación.
 */
export function columnasDeGrupo(filas: string[][]): number {
  if (filas.length < 2) return 0;
  const primera = filas[0];
  if (!primera) return 0;
  let n = 0;
  for (let c = 0; c < primera.length; c += 1) {
    const arranca = (primera[c] ?? '').trim() !== '';
    const hayHuecos = filas.some((fila, i) => i > 0 && (fila[c] ?? '').trim() === '');
    if (!arranca || !hayHuecos) break;
    n += 1;
  }
  // Agrupar por TODAS las columnas no dejaría nada que mostrar debajo.
  return n >= primera.length ? 0 : n;
}

/** Parte las filas en grupos, arrastrando el encabezado hacia abajo. */
export function agrupar(filas: string[][], nGrupo: number): Grupo[] {
  const grupos: Grupo[] = [];
  for (const fila of filas) {
    const encabezado = fila.slice(0, nGrupo).map((v) => v.trim());
    const resto = fila.slice(nGrupo);
    const abreGrupo = encabezado.some((v) => v !== '');
    const ultimo = grupos.at(-1);
    if (abreGrupo || !ultimo) grupos.push({ encabezado, filas: [resto] });
    else ultimo.filas.push(resto);
  }
  return grupos;
}

/**
 * El trozo entrecomillado del encabezado: de `"e" (al final de una sílaba
 * abierta)` saca `e`. Es lo que se resalta dentro de cada palabra para que se
 * vea de un vistazo por qué está en ese grupo.
 */
export function fragmento(encabezado: string[]): string | null {
  for (const parte of encabezado) {
    const m = /[«"'"]([^«»"'""]{1,12})[»"'"]/.exec(parte);
    const valor = m?.[1]?.trim();
    if (valor !== undefined && valor !== '') return valor;
  }
  return null;
}

/** Marca todas las apariciones de `trozo` en `texto`, sin distinguir mayúsculas. */
export function resaltar(texto: string, trozo: string | null): ReactNode {
  if (trozo === null || trozo === '') return texto;
  const bajo = texto.toLowerCase();
  const aguja = trozo.toLowerCase();
  const salida: ReactNode[] = [];
  let desde = 0;
  let i = bajo.indexOf(aguja);
  // Sin coincidencias se devuelve el texto tal cual: no toda palabra del
  // grupo tiene por qué contener el fragmento escrito.
  if (i === -1) return texto;
  while (i !== -1) {
    if (i > desde) salida.push(texto.slice(desde, i));
    salida.push(
      <mark className="blk-group__hit" key={`${String(i)}-${String(salida.length)}`}>
        {texto.slice(i, i + trozo.length)}
      </mark>,
    );
    desde = i + trozo.length;
    i = bajo.indexOf(aguja, desde);
  }
  if (desde < texto.length) salida.push(texto.slice(desde));
  return salida;
}

/**
 * Qué columna encabeza cada fila del grupo.
 *
 * La que más veces contiene el fragmento del encabezado: es la palabra por la
 * que esas filas están juntas, así que es la que debe leerse primero. Sin
 * fragmento, manda el orden original. Lo decide la forma de los datos, no
 * saber qué idioma es cuál.
 */
export function ordenDeColumnas(filas: string[][], trozo: string | null, nCols: number): number[] {
  const base = Array.from({ length: nCols }, (_, i) => i);
  if (trozo === null || trozo === '') return base;
  const aguja = trozo.toLowerCase();
  let mejor = -1;
  let maximo = 0;
  for (const c of base) {
    const aciertos = filas.filter((f) => (f[c] ?? '').toLowerCase().includes(aguja)).length;
    if (aciertos > maximo) {
      maximo = aciertos;
      mejor = c;
    }
  }
  if (mejor === -1) return base;
  return [mejor, ...base.filter((c) => c !== mejor)];
}
