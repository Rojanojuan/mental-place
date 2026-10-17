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
