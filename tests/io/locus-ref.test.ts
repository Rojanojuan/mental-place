import { describe, expect, it } from 'vitest';
import { type Catalog, resolveLocusRef } from '@/io';

const catalog: Catalog = {
  palaces: [
    { id: 'pal-1', name: 'Cuerpo 1 · Verbal + Nominal' },
    { id: 'pal-2', name: 'Cuerpo 2 · Oración + Discurso' },
    { id: 'pal-casa', name: 'Casa familiar' },
  ],
  loci: [
    { id: 'l1-8', palaceId: 'pal-1', routeNo: 8, partName: 'Hombro derecho' },
    { id: 'l1-9', palaceId: 'pal-1', routeNo: 9, partName: 'Tibia / Espinilla / Canilla' },
    { id: 'l2-8', palaceId: 'pal-2', routeNo: 8, partName: 'Hombro derecho' },
    { id: 'l2-3', palaceId: 'pal-2', routeNo: 3, partName: 'Mentón' },
    { id: 'lc-37', palaceId: 'pal-casa', routeNo: 37, partName: 'Lámpara de pie', room: 'Salón' },
    {
      id: 'lc-52',
      palaceId: 'pal-casa',
      routeNo: 52,
      partName: 'Lámpara de pie',
      room: 'Dormitorio',
    },
  ],
};

describe('resolveLocusRef · por número de ruta', () => {
  it('entiende «Palacio · L8»', () => {
    expect(resolveLocusRef('Cuerpo 1 · Verbal + Nominal · L8', catalog)).toEqual({
      ok: true,
      locusId: 'l1-8',
    });
  });

  it('entiende «Casa familiar · 37»', () => {
    expect(resolveLocusRef('Casa familiar · 37', catalog)).toEqual({
      ok: true,
      locusId: 'lc-37',
    });
  });

  it('distingue el mismo número en dos palacios', () => {
    expect(resolveLocusRef('Cuerpo 2 · Oración + Discurso · 8', catalog)).toEqual({
      ok: true,
      locusId: 'l2-8',
    });
  });

  it('acepta otros separadores', () => {
    for (const ref of ['Casa familiar | 37', 'Casa familiar / 37', 'Casa familiar > 37']) {
      expect(resolveLocusRef(ref, catalog), ref).toEqual({ ok: true, locusId: 'lc-37' });
    }
  });
});

describe('resolveLocusRef · por nombre', () => {
  it('entiende el nombre de la parte dentro de un palacio', () => {
    expect(resolveLocusRef('Cuerpo 1 · Verbal + Nominal · Hombro derecho', catalog)).toEqual({
      ok: true,
      locusId: 'l1-8',
    });
  });

  it('ignora mayúsculas y acentos', () => {
    expect(resolveLocusRef('Cuerpo 2 · Oración + Discurso · menton', catalog)).toEqual({
      ok: true,
      locusId: 'l2-3',
    });
    expect(resolveLocusRef('CUERPO 2 · ORACION + DISCURSO · MENTÓN', catalog)).toEqual({
      ok: true,
      locusId: 'l2-3',
    });
  });

  it('resuelve un nombre único sin decir el palacio', () => {
    expect(resolveLocusRef('Mentón', catalog)).toEqual({ ok: true, locusId: 'l2-3' });
  });

  it('acepta un nombre compuesto escrito a medias', () => {
    expect(resolveLocusRef('Cuerpo 1 · Verbal + Nominal · Tibia', catalog)).toEqual({
      ok: true,
      locusId: 'l1-9',
    });
  });

  it('desambigua los muebles repetidos con su habitación', () => {
    expect(resolveLocusRef('Casa familiar · Lámpara de pie · Salón', catalog)).toEqual({
      ok: true,
      locusId: 'lc-37',
    });
    expect(resolveLocusRef('Casa familiar · Lámpara de pie · Dormitorio', catalog)).toEqual({
      ok: true,
      locusId: 'lc-52',
    });
  });
});

describe('resolveLocusRef · cuando no puede', () => {
  it('avisa si el palacio no existe', () => {
    expect(resolveLocusRef('Cuerpo 9 · L1', catalog)).toEqual({ ok: false, reason: 'not-found' });
  });

  it('avisa si el punto no existe', () => {
    expect(resolveLocusRef('Casa familiar · 999', catalog)).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('nunca adivina entre dos candidatos', () => {
    const result = resolveLocusRef('Hombro derecho', catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('ambiguous');
      expect(result.candidates).toEqual(['Hombro derecho (#8)', 'Hombro derecho (#8)']);
    }
  });

  it('tampoco con un mueble repetido sin habitación', () => {
    const result = resolveLocusRef('Casa familiar · Lámpara de pie', catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('ambiguous');
  });

  it('rechaza una referencia vacía', () => {
    expect(resolveLocusRef('   ', catalog)).toEqual({ ok: false, reason: 'not-found' });
  });
});
