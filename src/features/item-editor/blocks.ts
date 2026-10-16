import type { Block } from '@/domain/types';

type TableBlock = Extract<Block, { type: 'table' }>;

export const BLOCK_LABEL: Record<Block['type'], string> = {
  text: 'Texto',
  list: 'Lista',
  table: 'Tabla',
  bilingual: 'Ejemplo EN/ES',
  error: 'Error típico',
  image: 'Imagen',
  note: 'Nota',
};

/** Un bloque vacío de cada tipo, para el botón de añadir. */
export function emptyBlock(type: Block['type']): Block {
  switch (type) {
    case 'text':
      return { type: 'text', md: '' };
    case 'note':
      return { type: 'note', md: '' };
    case 'list':
      return { type: 'list', items: [] };
    case 'table':
      return { type: 'table', columns: ['Columna 1', 'Columna 2'], rows: [] };
    case 'bilingual':
      return { type: 'bilingual', en: '', es: '' };
    case 'error':
      return { type: 'error', wrong: '', right: '' };
    case 'image':
      return { type: 'image', src: '', alt: '' };
  }
}

/** Una fila por línea, celdas separadas por «|» o tabulador. */
export function parseTable(text: string, caption?: string): TableBlock {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const [header = '', ...body] = lines;
  const columns = header
    .split(/\s*[|\t]\s*/)
    .map((cell) => cell.trim())
    .filter((cell) => cell !== '');
  const width = Math.max(1, columns.length);
  const rows = body.map((line) => {
    const cells = line.split(/\s*[|\t]\s*/).map((cell) => cell.trim());
    // Las filas se cuadran al ancho de la cabecera: una tabla desigual rompe el render.
    return Array.from({ length: width }, (_, index) => cells[index] ?? '');
  });
  const block: TableBlock = { type: 'table', columns, rows };
  if (caption !== undefined && caption !== '') block.caption = caption;
  return block;
}
