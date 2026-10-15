import { describe, expect, it } from 'vitest';
import {
  backupFilename,
  bundleToCsv,
  csvToBundle,
  guessSeparator,
  parseCsv,
  serializeBundle,
  suggestMapping,
} from '@/io';
import { miniBundle } from '../db/helpers';

const NOW = new Date(2026, 9, 15, 12, 0);

describe('parseCsv', () => {
  it('lee cabeceras y filas', () => {
    const table = parseCsv('titulo,frente,reverso\nCasa,house,casa\nPerro,dog,perro');
    expect(table.headers).toEqual(['titulo', 'frente', 'reverso']);
    expect(table.rows).toEqual([
      ['Casa', 'house', 'casa'],
      ['Perro', 'dog', 'perro'],
    ]);
  });

  it('respeta las comillas y las comas de dentro', () => {
    const table = parseCsv('a,b\n"uno, dos",tres');
    expect(table.rows).toEqual([['uno, dos', 'tres']]);
  });

  it('entiende las comillas escapadas', () => {
    const table = parseCsv('a\n"dice ""hola"""');
    expect(table.rows).toEqual([['dice "hola"']]);
  });

  it('admite saltos de línea dentro de una celda', () => {
    const table = parseCsv('a,b\n"linea 1\nlinea 2",x');
    expect(table.rows).toEqual([['linea 1\nlinea 2', 'x']]);
  });

  it('trata \\r\\n como un solo salto', () => {
    const table = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(table.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('se come el BOM que pone Excel', () => {
    const table = parseCsv('﻿titulo,frente\nCasa,house');
    expect(table.headers).toEqual(['titulo', 'frente']);
  });

  it('salta las líneas vacías', () => {
    const table = parseCsv('a,b\n1,2\n\n\n3,4\n');
    expect(table.rows).toHaveLength(2);
  });

  it('acepta otro separador', () => {
    const table = parseCsv('a;b\n1;2', ';');
    expect(table.rows).toEqual([['1', '2']]);
  });
});

describe('guessSeparator', () => {
  it('reconoce la coma, el punto y coma y el tabulador', () => {
    expect(guessSeparator('a,b,c\n1,2,3')).toBe(',');
    expect(guessSeparator('a;b;c\n1;2;3')).toBe(';');
    expect(guessSeparator('a\tb\tc')).toBe('\t');
  });

  it('se queda con la coma si no hay ninguno', () => {
    expect(guessSeparator('unacolumna')).toBe(',');
  });
});

describe('suggestMapping', () => {
  it('reconoce las cabeceras en español', () => {
    expect(
      suggestMapping(['titulo', 'frente', 'reverso', 'punto', 'etiquetas', 'prioridad']),
    ).toEqual({ title: 0, front: 1, back: 2, locusRef: 3, tags: 4, priority: 5 });
  });

  it('también en inglés y con acentos o mayúsculas', () => {
    expect(suggestMapping(['Title', 'Front', 'Back', 'Locus'])).toEqual({
      title: 0,
      front: 1,
      back: 2,
      locusRef: 3,
    });
    expect(suggestMapping(['Palabra', 'Traducción'])).toEqual({ title: 0, back: 1 });
  });

  it('no inventa lo que no reconoce', () => {
    expect(suggestMapping(['columna x', 'columna y'])).toEqual({});
  });
});

describe('csvToBundle', () => {
  const table = parseCsv(
    [
      'titulo,frente,reverso,punto,etiquetas,prioridad,notas',
      'Casa,house,casa,Palacio pal-1 · 1,"sustantivo; basico",3,Ojo con la h',
      'Perro,dog,perro,Parte 2,animal,1,',
      ',,,,,,',
    ].join('\n'),
  );
  const mapping = suggestMapping(table.headers);
  const options = { templateId: 'tpl-libre', deckId: 'dck-1', idPrefix: 'csv', now: NOW };

  it('convierte cada fila en un ítem', () => {
    const bundle = csvToBundle(table, mapping, options);
    expect(bundle.items).toHaveLength(2);
    expect(bundle.items?.[0]).toMatchObject({
      id: 'csv-1',
      title: 'Casa',
      front: 'house',
      back: 'casa',
      templateId: 'tpl-libre',
      deckId: 'dck-1',
      origin: 'import',
      priority: 3,
      locusId: null,
    });
  });

  it('parte las etiquetas por coma, punto y coma o barra', () => {
    const bundle = csvToBundle(table, mapping, options);
    expect(bundle.items?.[0]?.tags).toEqual(['sustantivo', 'basico']);
    expect(bundle.items?.[1]?.tags).toEqual(['animal']);
  });

  it('guarda la referencia al punto para que la resuelva el plan', () => {
    const bundle = csvToBundle(table, mapping, options);
    const first = bundle.items?.[0] as { locusRef?: string } | undefined;
    expect(first?.locusRef).toBe('Palacio pal-1 · 1');
  });

  it('pasa las notas a un bloque', () => {
    const bundle = csvToBundle(table, mapping, options);
    expect(bundle.items?.[0]?.blocks).toEqual([{ type: 'note', md: 'Ojo con la h' }]);
    expect(bundle.items?.[1]?.blocks).toEqual([]);
  });

  it('salta las filas sin título ni frente', () => {
    const bundle = csvToBundle(table, mapping, options);
    expect(bundle.items?.map((i) => i.title)).toEqual(['Casa', 'Perro']);
  });

  it('usa el frente como título si no hay columna de título', () => {
    const simple = parseCsv('frente,reverso\nhouse,casa');
    const bundle = csvToBundle(simple, suggestMapping(simple.headers), options);
    expect(bundle.items?.[0]?.title).toBe('house');
  });

  it('omite los campos que no se mapean', () => {
    const simple = parseCsv('titulo\nCasa');
    const bundle = csvToBundle(simple, { title: 0 }, options);
    expect(bundle.items?.[0]).not.toHaveProperty('front');
    expect(bundle.items?.[0]).not.toHaveProperty('priority');
    expect(bundle.items?.[0]?.tags).toEqual([]);
  });
});

describe('ida y vuelta de CSV', () => {
  it('lo exportado se vuelve a leer igual', () => {
    const csv = bundleToCsv(miniBundle());
    const table = parseCsv(csv);
    expect(table.headers).toEqual([
      'titulo',
      'frente',
      'reverso',
      'punto',
      'etiquetas',
      'prioridad',
    ]);
    expect(table.rows).toHaveLength(3);
    // El punto sale como «Palacio · nº de ruta», que el plan sabe resolver.
    expect(table.rows[0]?.[3]).toBe('Palacio pal-1 · 1');
  });

  it('escapa las comas y las comillas al exportar', () => {
    const csv = bundleToCsv({
      version: 1,
      items: [
        {
          id: 'x',
          locusId: null,
          templateId: 't',
          title: 'uno, dos',
          back: 'dice "hola"',
          blocks: [],
          tags: [],
          fields: {},
          origin: 'manual',
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const table = parseCsv(csv);
    expect(table.rows[0]?.[0]).toBe('uno, dos');
    expect(table.rows[0]?.[2]).toBe('dice "hola"');
  });
});

describe('copia de seguridad', () => {
  it('serializa con sangría y salto final', () => {
    const text = serializeBundle({ version: 1 });
    expect(text).toBe('{\n  "version": 1\n}\n');
  });

  it('nombra el archivo con la fecha', () => {
    expect(backupFilename(NOW)).toBe('palacio-corporal-2026-10-15.json');
    expect(backupFilename(NOW, 'csv')).toBe('palacio-corporal-2026-10-15.csv');
  });
});
