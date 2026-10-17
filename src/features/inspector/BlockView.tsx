import type { ReactNode } from 'react';
import type { Block } from '@/domain/types';

/**
 * Caracteres del bloque Unicode de extensiones IPA y modificadores.
 * Las celdas que los contienen (y las puramente numéricas) se pintan en
 * monoespaciada, como pide el sistema de diseño para fórmulas y números.
 */
const NUM_RE = /^\d+$/;

/** Extensiones IPA (U+0250–U+02FF) y la tie bar de las africadas (U+0361). */
function hasIpa(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x0250 && code <= 0x02ff) || code === 0x0361) return true;
  }
  return false;
}

const isTechnical = (value: string): boolean => hasIpa(value) || NUM_RE.test(value);

/** Formateo mínimo de `**negrita**`; no se añade una dependencia de Markdown. */
function inline(md: string): ReactNode[] {
  return md
    .split(/(\*\*[^*]+\*\*)/g)
    .map((chunk, i) =>
      chunk.startsWith('**') && chunk.endsWith('**') ? (
        <strong key={i}>{chunk.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{chunk}</span>
      ),
    );
}

/**
 * Renderiza los bloques genéricos del contrato. No sabe nada del contenido:
 * sirve igual para fonética, gramática o cualquier otra plantilla.
 */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <p className="blk-text">{inline(block.md)}</p>;

    case 'note':
      return <aside className="blk-note">{inline(block.md)}</aside>;

    case 'list':
      return (
        <ul className="blk-list">
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      );

    case 'table':
      return (
        // Una tabla de cinco columnas o más no cabe en un teléfono: la de
        // «minimal pairs» tiene ocho y solo se veía el 54 %, con 270 px que
        // había que ir arrastrando fila por fila. Marcada como ancha, el CSS
        // la apila en pantalla estrecha y cada celda lleva su rótulo. Es el
        // número de columnas lo que decide, no de qué va la tabla.
        <figure className={`blk-table${block.columns.length >= 5 ? ' blk-table--wide' : ''}`}>
          {block.caption !== undefined && <figcaption>{block.caption}</figcaption>}
          <div className="blk-table__scroll">
            <table>
              <thead>
                <tr>
                  {block.columns.map((col, i) => (
                    <th key={i} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => {
                      // Una celda que solo repite el nombre de su columna no
                      // dice nada: la «vs.» de los minimal pairs salía como
                      // «vs. — vs.» ocho veces por tabla. Apilada se convierte
                      // en el separador entre las dos mitades que se contrastan.
                      const repite = cell.trim() !== '' && cell.trim() === (block.columns[c] ?? '').trim();
                      const clases = [isTechnical(cell) ? 'mono' : '', repite ? 'blk-table__dup' : '']
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <td
                          key={c}
                          // El rótulo que el CSS pinta delante al apilar.
                          data-label={block.columns[c] ?? ''}
                          className={clases === '' ? undefined : clases}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );

    case 'bilingual':
      return (
        <p className="blk-bilingual">
          <span className="blk-bilingual__en">{block.en}</span>
          <span className="blk-bilingual__es">{block.es}</span>
        </p>
      );

    case 'error':
      return (
        <p className="blk-error">
          <s>{block.wrong}</s> <strong>{block.right}</strong>
          {block.why !== undefined && <em> — {block.why}</em>}
        </p>
      );

    case 'image':
      return <img className="blk-image" src={block.src} alt={block.alt} />;

    default:
      return null;
  }
}
