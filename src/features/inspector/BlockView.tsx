import type { ReactNode } from 'react';
import type { Block } from '@/domain/types';
import { GroupedTable } from './GroupedTable';
import { columnasDeGrupo } from './grouping';

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
/**
 * Cuánto estorba una tabla en un teléfono, por su número de columnas.
 *
 * Cinco o más no caben en ningún móvil: de los «minimal pairs» (ocho) solo se
 * veía el 54 %, con 270 px que había que arrastrar fila por fila. Tres o
 * cuatro sí caben en un teléfono normal, pero no en uno de 320 px, así que el
 * CSS las apila solo ahí.
 */
function anchoDeTabla(columnas: number): string {
  if (columnas >= 5) return ' blk-table--wide';
  if (columnas >= 3) return ' blk-table--midi';
  return '';
}

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

    case 'table': {
      // Una tabla cuyas primeras columnas solo vienen en la primera fila de
      // cada grupo se lee por grupos, no como rejilla: al apilarla, las filas
      // de continuacion perdian su patron y quedaban palabras sueltas.
      const nGrupo = columnasDeGrupo(block.rows);
      if (nGrupo > 0) {
        return (
          <GroupedTable
            columns={block.columns}
            rows={block.rows}
            caption={block.caption}
            nGrupo={nGrupo}
            esTecnica={isTechnical}
          />
        );
      }
      return (
        // El CSS apila la tabla cuando no cabe, y cada celda lleva su
        // rótulo. Es el número de columnas lo que decide, no de qué va la
        // tabla (regla 2: nada de contenido en la app).
        <figure className={`blk-table${anchoDeTabla(block.columns.length)}`}>
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
                      const repite =
                        cell.trim() !== '' && cell.trim() === (block.columns[c] ?? '').trim();
                      const clases = [
                        isTechnical(cell) ? 'mono' : '',
                        repite ? 'blk-table__dup' : '',
                      ]
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
    }

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
