import type { Bundle } from '@/domain/types';

/** El paquete como texto, con sangría para que se pueda leer y versionar. */
export function serializeBundle(bundle: Bundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

/** Nombre del archivo de copia: `palacio-corporal-2026-10-15.json`. */
export function backupFilename(now = new Date(), extension = 'json'): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `palacio-corporal-${date}.${extension}`;
}

/**
 * Descarga un texto como archivo. Único punto del módulo que toca el DOM, por
 * eso vive aparte: el resto de `src/io` es puro y se prueba sin navegador.
 */
export function downloadText(content: string, filename: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Copia de seguridad completa en JSON v1. */
export function downloadBackup(bundle: Bundle, now = new Date()): void {
  downloadText(serializeBundle(bundle), backupFilename(now));
}
