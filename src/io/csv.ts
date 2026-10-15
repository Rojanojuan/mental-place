import type { Bundle, Item } from '@/domain/types';

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/**
 * Lector de CSV sin dependencias: comillas dobles, comillas escapadas (`""`),
 * saltos de línea dentro de una celda y separador configurable.
 */
export function parseCsv(text: string, separator = ','): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  // El BOM de Excel se cuela como primer carácter y rompe la primera cabecera.
  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char ?? '';
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      // \r\n cuenta como un solo salto.
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += char ?? '';
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmpty = rows.filter((entry) => entry.some((value) => value.trim() !== ''));
  const [headers = [], ...body] = nonEmpty;
  return { headers: headers.map((header) => header.trim()), rows: body };
}

/** Adivina el separador: coma, punto y coma o tabulador. */
export function guessSeparator(text: string): string {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const counts = [',', ';', '\t'].map((candidate) => ({
    candidate,
    count: firstLine.split(candidate).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0] && counts[0].count > 0 ? counts[0].candidate : ',';
}

/** Qué columna del CSV va a cada campo. El índice es la posición en `headers`. */
export interface CsvMapping {
  title?: number;
  front?: number;
  back?: number;
  locusRef?: number;
  tags?: number;
  priority?: number;
  notes?: number;
}

export interface CsvImportOptions {
  templateId: string;
  deckId?: string;
  /** Para que los ids e instantes sean reproducibles en los tests. */
  idPrefix?: string;
  now?: Date;
}

/**
 * Propone un mapeo leyendo las cabeceras: reconoce los nombres habituales en
 * español y en inglés. El usuario puede cambiarlo en la pantalla.
 */
export function suggestMapping(headers: string[]): CsvMapping {
  const fold = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();

  const CANDIDATES: Record<keyof CsvMapping, string[]> = {
    title: ['titulo', 'title', 'nombre', 'palabra', 'word', 'concepto'],
    front: ['frente', 'front', 'pregunta', 'question', 'anverso'],
    back: ['reverso', 'back', 'respuesta', 'answer', 'traduccion', 'translation'],
    locusRef: ['punto', 'locus', 'locusref', 'parte', 'lugar', 'mueble'],
    tags: ['etiquetas', 'tags', 'etiqueta'],
    priority: ['prioridad', 'priority', 'frecuencia', 'orden', 'n'],
    notes: ['notas', 'notes', 'nota', 'comentario'],
  };

  const mapping: CsvMapping = {};
  const folded = headers.map(fold);
  for (const [field, names] of Object.entries(CANDIDATES) as [keyof CsvMapping, string[]][]) {
    const index = folded.findIndex((header) => names.includes(header));
    if (index >= 0) mapping[field] = index;
  }
  return mapping;
}

/**
 * Convierte un CSV mapeado en un paquete de ítems listo para la vista previa.
 * Lo que no se mapea no se inventa; `locusRef` lo resuelve `planImport()`.
 */
export function csvToBundle(
  table: CsvTable,
  mapping: CsvMapping,
  options: CsvImportOptions,
): Bundle {
  const stamp = (options.now ?? new Date()).toISOString();
  const prefix = options.idPrefix ?? `csv-${String(Date.parse(stamp))}`;
  const cell = (row: string[], index: number | undefined): string =>
    index === undefined ? '' : (row[index] ?? '').trim();

  const items: (Item & { locusRef?: string })[] = [];
  for (const [position, row] of table.rows.entries()) {
    const title = cell(row, mapping.title) || cell(row, mapping.front);
    if (title === '') continue;

    const item: Item & { locusRef?: string } = {
      id: `${prefix}-${String(position + 1)}`,
      locusId: null,
      templateId: options.templateId,
      title,
      blocks: [],
      tags: cell(row, mapping.tags)
        .split(/[,;|]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      fields: {},
      origin: 'import',
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (options.deckId !== undefined) item.deckId = options.deckId;

    const front = cell(row, mapping.front);
    const back = cell(row, mapping.back);
    if (front !== '') item.front = front;
    if (back !== '') item.back = back;

    const notes = cell(row, mapping.notes);
    if (notes !== '') item.blocks.push({ type: 'note', md: notes });

    const priority = Number(cell(row, mapping.priority));
    if (Number.isFinite(priority) && cell(row, mapping.priority) !== '') item.priority = priority;

    const ref = cell(row, mapping.locusRef);
    if (ref !== '') item.locusRef = ref;

    items.push(item);
  }

  return { version: 1, items };
}

/** Serializa un paquete a CSV, para sacar los ítems a una hoja de cálculo. */
export function bundleToCsv(bundle: Bundle): string {
  const escape = (value: string): string =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const header = ['titulo', 'frente', 'reverso', 'punto', 'etiquetas', 'prioridad'];
  const byLocus = new Map((bundle.loci ?? []).map((locus) => [locus.id, locus]));
  const byPalace = new Map((bundle.palaces ?? []).map((palace) => [palace.id, palace]));

  const lines = [header.join(',')];
  for (const item of bundle.items ?? []) {
    const locus = item.locusId === null ? undefined : byLocus.get(item.locusId);
    const palace = locus ? byPalace.get(locus.palaceId) : undefined;
    const ref =
      locus && palace ? `${palace.name} · ${String(locus.routeNo)}` : (locus?.partName ?? '');
    lines.push(
      [
        item.title,
        item.front ?? '',
        item.back ?? '',
        ref,
        item.tags.join('; '),
        item.priority === undefined ? '' : String(item.priority),
      ]
        .map(escape)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}
