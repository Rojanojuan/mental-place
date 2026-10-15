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
        <figure className="blk-table">
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
                    {row.map((cell, c) => (
                      <td key={c} className={isTechnical(cell) ? 'mono' : undefined}>
                        {cell}
                      </td>
                    ))}
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
