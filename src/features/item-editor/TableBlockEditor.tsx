import { useState } from 'react';
import type { Block } from '@/domain/types';
import { parseTable } from './blocks';

type TableBlock = Extract<Block, { type: 'table' }>;

const toText = (block: TableBlock): string =>
  [block.columns, ...block.rows].map((row) => row.join(' | ')).join('\n');

export interface TableBlockEditorProps {
  block: TableBlock;
  index: number;
  onChange: (block: Block) => void;
}

/**
 * Editor de tabla como texto.
 *
 * Guarda su propio texto por el mismo motivo que `NumberField`: si el valor
 * saliera del bloque, al vaciar el área la tabla se reconstruiría con una
 * columna por defecto y lo tecleado se pegaría detrás (ver D-044).
 */
export function TableBlockEditor({ block, index, onChange }: TableBlockEditorProps) {
  const [text, setText] = useState(() => toText(block));
  const [caption, setCaption] = useState(block.caption ?? '');

  return (
    <>
      <label className="blke__field">
        <span>Título de la tabla</span>
        <input
          id={`blk-${String(index)}-caption`}
          type="text"
          value={caption}
          onChange={(event) => {
            setCaption(event.target.value);
            onChange(parseTable(text, event.target.value));
          }}
        />
      </label>
      <label className="blke__field">
        <span>Tabla — primera línea las columnas, celdas separadas por «|»</span>
        <textarea
          id={`blk-${String(index)}-table`}
          rows={5}
          className="mono"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onChange(parseTable(event.target.value, caption));
          }}
        />
      </label>
    </>
  );
}
