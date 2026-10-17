import { type Grupo, agrupar, fragmento, ordenDeColumnas, resaltar } from './grouping';

/**
 * Tabla por grupos: la de «patrones» y cualquier otra con la misma forma.
 *
 * El grupo manda —es una cabecera— y sus filas cuelgan de él, en vez de ser
 * una rejilla cuyas filas de continuación pierden el dato que las agrupa.
 */
export function GroupedTable({
  columns,
  rows,
  caption,
  nGrupo,
  esTecnica,
}: {
  columns: string[];
  rows: string[][];
  caption?: string | undefined;
  nGrupo: number;
  esTecnica: (valor: string) => boolean;
}) {
  const grupos: Grupo[] = agrupar(rows, nGrupo);
  const etiquetas = columns.slice(nGrupo);
  const titulos = columns.slice(0, nGrupo);

  return (
    <figure className="blk-group">
      {caption !== undefined && <figcaption>{caption}</figcaption>}
      {grupos.map((grupo, g) => {
        const trozo = fragmento(grupo.encabezado);
        // Encabeza la columna que contiene el patron: es la palabra por la
        // que estas filas estan juntas.
        const base = ordenDeColumnas(grupo.filas, trozo, etiquetas.length);
        // Y tras ella van las columnas tecnicas —la transcripcion—, que son
        // anotaciones cortas y acompañan a la palabra en la misma linea; lo
        // demas (la traduccion) cierra la fila.
        const esColumnaTecnica = (c: number): boolean => {
          const valores = grupo.filas.map((f) => f[c] ?? '').filter((v) => v.trim() !== '');
          if (valores.length === 0) return false;
          return valores.filter((v) => esTecnica(v)).length * 2 > valores.length;
        };
        const cabeza = base.slice(0, 1);
        const resto = base.slice(1);
        const orden = [
          ...cabeza,
          ...resto.filter((c) => esColumnaTecnica(c)),
          ...resto.filter((c) => !esColumnaTecnica(c)),
        ];
        return (
          <section className="blk-group__set" key={g}>
            <h4 className="blk-group__head">
              {grupo.encabezado.map((valor, i) =>
                valor === '' ? null : (
                  <span
                    key={i}
                    className={i === 0 && nGrupo > 1 ? 'blk-group__n mono' : 'blk-group__key'}
                    // El nombre de la columna acompaña al valor para quien no
                    // ve la tabla: «Patrón: "ee"».
                    aria-label={`${titulos[i] ?? ''}: ${valor}`}
                  >
                    {valor}
                  </span>
                ),
              )}
              <span className="blk-group__count">
                {grupo.filas.length} {grupo.filas.length === 1 ? 'palabra' : 'palabras'}
              </span>
            </h4>

            <ul className="blk-group__rows">
              {grupo.filas.map((fila, r) => (
                <li key={r}>
                  {orden.map((c, pos) => {
                    const celda = fila[c] ?? '';
                    if (celda.trim() === '') return null;
                    const clases = [
                      'blk-group__cell',
                      pos === 0 ? 'blk-group__cell--lead' : '',
                      esTecnica(celda) ? 'mono' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <span key={c} className={clases} data-label={etiquetas[c] ?? ''}>
                        {/* Solo se resalta en la palabra que define el grupo:
                            marcarlo tambien en la traduccion («Golpear» por
                            «ea») confunde, que es justo lo que habia que
                            evitar en un repaso. */}
                        {pos === 0 ? resaltar(celda, trozo) : celda}
                      </span>
                    );
                  })}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </figure>
  );
}
