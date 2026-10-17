/**
 * Los tipos de lo que el Worker expone para poder probarlo.
 *
 * El Worker corre en Cloudflare, no en la app, así que vive en JavaScript
 * plano; esto es solo para que los tests lo importen con tipos.
 */

/** Deja solo las fechas futuras o recién vencidas, ordenadas y sin repetir. */
export function limpiarFechas(fechas: number[], ahora: number): number[];

/** Si hay alguna fecha ya cumplida que todavía merezca un aviso. */
export function tocaAvisar(fechas: number[], ahora: number): boolean;

/** Las claves de los dispositivos registrados, en una sola entrada de KV. */
export function leerIndice(env: { AVISOS: KVNamespaceLike }): Promise<string[]>;

/** Recorre el índice, envía a quien le toque y devuelve cuántos avisos salieron. */
export function repartir(env: { AVISOS: KVNamespaceLike }): Promise<number>;

/** Lo poco que se usa de KV, para poder doblarlo en los tests. */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
