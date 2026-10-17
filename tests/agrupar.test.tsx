import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockView } from '@/features/inspector/BlockView';
import {
  agrupar,
  columnasDeGrupo,
  fragmento,
  ordenDeColumnas,
} from '@/features/inspector/grouping';

/** La forma real de la tabla de patrones del Word. */
const PATRONES = [
  ['1', '"ee"', 'Ver', 'See', 'siː'],
  ['', '', 'Árbol', 'Tree', 'triː'],
  ['', '', 'Dormir', 'Sleep', 'sliːp'],
  ['2', '"ea"', 'Mar', 'Sea', 'siː'],
  ['', '', 'Carne', 'Meat', 'miːt'],
];

describe('detectar las columnas que agrupan', () => {
  it('reconoce las dos primeras de la tabla de patrones', () => {
    expect(columnasDeGrupo(PATRONES)).toBe(2);
  });

  it('una tabla con todas las celdas llenas no agrupa', () => {
    // Los «minimal pairs»: ocho columnas, ninguna vacía.
    expect(
      columnasDeGrupo([
        ['1', 'Eat', 'iːt', 'Comer'],
        ['2', 'Ease', 'iːz', 'Facilidad'],
      ]),
    ).toBe(0);
  });

  it('un hueco en medio no es una agrupación', () => {
    // La tercera columna tiene un hueco, pero la primera no: se para en 1.
    expect(
      columnasDeGrupo([
        ['1', 'a', 'x'],
        ['', 'b', ''],
      ]),
    ).toBe(1);
  });

  it('no agrupa por todas las columnas: no quedaría nada debajo', () => {
    expect(
      columnasDeGrupo([
        ['1', 'a'],
        ['', ''],
      ]),
    ).toBe(0);
  });

  it('una sola fila no agrupa', () => {
    expect(columnasDeGrupo([['1', 'a', 'b']])).toBe(0);
  });
});

describe('repartir las filas en grupos', () => {
  it('arrastra el encabezado hacia abajo', () => {
    const grupos = agrupar(PATRONES, 2);
    expect(grupos).toHaveLength(2);
    expect(grupos[0]?.encabezado).toEqual(['1', '"ee"']);
    expect(grupos[0]?.filas).toHaveLength(3);
    expect(grupos[1]?.encabezado).toEqual(['2', '"ea"']);
    expect(grupos[1]?.filas).toHaveLength(2);
    // Las columnas de agrupación ya no viajan en las filas.
    expect(grupos[0]?.filas[0]).toEqual(['Ver', 'See', 'siː']);
  });
});

describe('el fragmento que da nombre al grupo', () => {
  it('saca lo entrecomillado', () => {
    expect(fragmento(['1', '"ee"'])).toBe('ee');
  });

  it('ignora lo que viene después de las comillas', () => {
    expect(fragmento(['3', '"e" (al final de una sílaba abierta)'])).toBe('e');
  });

  it('sin comillas no hay fragmento', () => {
    expect(fragmento(['7', 'Excepciones varias'])).toBeNull();
  });
});

describe('qué columna encabeza la fila', () => {
  it('manda la que contiene el patrón', () => {
    const grupos = agrupar(PATRONES, 2);
    // Columnas restantes: Español(0), Inglés(1), Transcripción(2).
    expect(ordenDeColumnas(grupos[0]!.filas, 'ee', 3)[0]).toBe(1);
  });

  it('sin fragmento se respeta el orden original', () => {
    expect(ordenDeColumnas([['a', 'b']], null, 2)).toEqual([0, 1]);
  });

  it('si el fragmento no aparece en ninguna, tampoco se reordena', () => {
    expect(ordenDeColumnas([['a', 'b']], 'zz', 2)).toEqual([0, 1]);
  });
});

describe('la tabla de patrones en pantalla', () => {
  const bloque = {
    type: 'table' as const,
    caption: 'Patrones del sonido',
    columns: ['#', 'Patrón', 'Español', 'Inglés', 'Transcripción'],
    rows: PATRONES,
  };

  it('cada patrón es un grupo con su cuenta de palabras', () => {
    render(<BlockView block={bloque} />);
    expect(screen.getByText('"ee"')).toBeInTheDocument();
    expect(screen.getByText('"ea"')).toBeInTheDocument();
    expect(screen.getByText('3 palabras')).toBeInTheDocument();
    expect(screen.getByText('2 palabras')).toBeInTheDocument();
  });

  it('las palabras de continuación siguen bajo su patrón', () => {
    const { container } = render(<BlockView block={bloque} />);
    const grupos = container.querySelectorAll('.blk-group__set');
    expect(grupos).toHaveLength(2);
    // «Sleep» venía en una fila sin patrón: antes quedaba suelta.
    expect(within(grupos[0] as HTMLElement).getByText(/Sl/)).toBeInTheDocument();
    expect(within(grupos[1] as HTMLElement).getByText(/Carne/)).toBeInTheDocument();
  });

  it('resalta el patrón dentro de cada palabra', () => {
    const { container } = render(<BlockView block={bloque} />);
    const marcas = [...container.querySelectorAll('mark')].map((m) => m.textContent);
    // «ee» en See, Tree y Sleep; «ea» en Sea y Meat.
    expect(marcas).toEqual(['ee', 'ee', 'ee', 'ea', 'ea']);
  });

  it('no lo resalta en la traducción, que confundiría', () => {
    const { container } = render(
      <BlockView
        block={{
          type: 'table',
          caption: 'Patrones del sonido',
          columns: ['#', 'Patrón', 'Español', 'Inglés', 'Transcripción'],
          rows: [
            ['1', '"ea"', 'Golpear', 'Beat', 'biːt'],
            ['', '', 'Mar', 'Sea', 'siː'],
          ],
        }}
      />,
    );
    const marcas = [...container.querySelectorAll('mark')].map((m) => m.textContent);
    // «Golpear» contiene «ea», pero el patrón es de la grafía inglesa.
    expect(marcas).toEqual(['ea', 'ea']);
    expect(container.querySelector('mark')?.closest('span')).toHaveClass('blk-group__cell--lead');
  });

  it('la palabra con el patrón encabeza su fila', () => {
    const { container } = render(<BlockView block={bloque} />);
    const primera = container.querySelector('.blk-group__rows li');
    expect(primera?.firstElementChild).toHaveClass('blk-group__cell--lead');
    expect(primera?.firstElementChild).toHaveTextContent('See');
  });

  it('una tabla sin agrupar se sigue pintando como tabla', () => {
    const { container } = render(
      <BlockView
        block={{
          type: 'table',
          caption: 'Ejemplos',
          columns: ['Español', 'Inglés', 'Transcripción'],
          rows: [
            ['Ver', 'See', 'siː'],
            ['Mar', 'Sea', 'siː'],
          ],
        }}
      />,
    );
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('.blk-group')).toBeNull();
  });
});
