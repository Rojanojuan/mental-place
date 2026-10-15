import { describe, expect, it } from 'vitest';
import { COLLECTIONS, type ExistingIds, planImport, planTotal } from '@/io';
import type { Catalog } from '@/io';
import { item, locus, miniBundle, palace } from '../db/helpers';

const catalog: Catalog = {
  palaces: [{ id: 'pal-1', name: 'Palacio pal-1' }],
  loci: [
    { id: 'loc-1', palaceId: 'pal-1', routeNo: 1, partName: 'Parte 1' },
    { id: 'loc-2', palaceId: 'pal-1', routeNo: 2, partName: 'Parte 2' },
  ],
};

const nothing = (): ExistingIds =>
  Object.fromEntries(COLLECTIONS.map((name) => [name, new Set<string>()])) as ExistingIds;

const withExisting = (overrides: Partial<Record<string, string[]>>): ExistingIds => {
  const base = nothing();
  for (const [name, ids] of Object.entries(overrides)) {
    base[name as keyof ExistingIds] = new Set(ids ?? []);
  }
  return base;
};

describe('planImport · validación', () => {
  it('acepta un paquete bien formado', () => {
    const plan = planImport(miniBundle(), catalog, nothing());
    expect(plan.ok).toBe(true);
    expect(plan.errors).toEqual([]);
    expect(plan.bundle?.loci).toHaveLength(3);
  });

  it('rechaza algo que no es un paquete', () => {
    const plan = planImport({ hola: 'mundo' }, catalog, nothing());
    expect(plan.ok).toBe(false);
    expect(plan.bundle).toBeNull();
    expect(plan.errors.length).toBeGreaterThan(0);
  });

  it('rechaza otra versión del formato', () => {
    const plan = planImport({ version: 2, items: [] }, catalog, nothing());
    expect(plan.ok).toBe(false);
    expect(plan.errors[0]?.path).toBe('version');
  });

  it('señala el campo exacto que falla', () => {
    const broken = {
      version: 1,
      loci: [{ ...locus('loc-x', 'pal-1', 1), pos: { x: 1.5, y: 0.2 } }],
    };
    const plan = planImport(broken, catalog, nothing());
    expect(plan.ok).toBe(false);
    expect(plan.errors[0]?.path).toBe('loci.0.pos.x');
  });

  it('rechaza un horario sin intervalos', () => {
    const plan = planImport(
      {
        version: 1,
        schedules: [
          {
            id: 'sch-x',
            name: 'Vacío',
            mode: 'checkpoints',
            intervals: [],
            rules: {
              againAction: 'reset',
              hardFactor: 0.5,
              easySkip: 2,
              minInterval: { value: 10, unit: 'min' },
              dayStartHour: 8,
            },
          },
        ],
      },
      catalog,
      nothing(),
    );
    expect(plan.ok).toBe(false);
    expect(plan.errors[0]?.message).toMatch(/al menos un intervalo/);
  });

  it('rechaza una fecha que no es ISO', () => {
    const plan = planImport(
      { version: 1, items: [{ ...item('itm-x', null), createdAt: 'ayer' }] },
      catalog,
      nothing(),
    );
    expect(plan.ok).toBe(false);
    expect(plan.errors[0]?.message).toMatch(/fecha ISO/);
  });
});

describe('planImport · qué se crea y qué se sobrescribe', () => {
  it('cuenta todo como nuevo en una base vacía', () => {
    const plan = planImport(miniBundle(), catalog, nothing());
    expect(plan.diff.loci).toEqual({ create: 3, update: 0 });
    expect(plan.diff.items).toEqual({ create: 3, update: 0 });
    expect(planTotal(plan)).toEqual({ create: 13, update: 0 });
  });

  it('distingue lo que ya existe', () => {
    const plan = planImport(
      miniBundle(),
      catalog,
      withExisting({ loci: ['loc-1', 'loc-2'], items: ['itm-1'] }),
    );
    expect(plan.diff.loci).toEqual({ create: 1, update: 2 });
    expect(plan.diff.items).toEqual({ create: 2, update: 1 });
  });

  it('un paquete parcial solo cuenta su colección', () => {
    const plan = planImport({ version: 1, items: [item('itm-x', null)] }, catalog, nothing());
    expect(plan.diff.items).toEqual({ create: 1, update: 0 });
    expect(plan.diff.loci).toEqual({ create: 0, update: 0 });
  });
});

describe('planImport · referencias por nombre', () => {
  const withRef = (ref: string) => ({
    version: 1,
    items: [{ ...item('itm-ref', null), locusRef: ref }],
  });

  it('resuelve la referencia a su punto', () => {
    const plan = planImport(withRef('Palacio pal-1 · 2'), catalog, nothing());
    expect(plan.bundle?.items?.[0]?.locusId).toBe('loc-2');
    expect(plan.unresolved).toEqual([]);
  });

  it('quita `locusRef` del ítem guardado', () => {
    const plan = planImport(withRef('Palacio pal-1 · 2'), catalog, nothing());
    expect(plan.bundle?.items?.[0]).not.toHaveProperty('locusRef');
  });

  it('deja el ítem sin asignar si no encuentra el punto', () => {
    const plan = planImport(withRef('Palacio pal-1 · 99'), catalog, nothing());
    expect(plan.ok).toBe(true);
    expect(plan.bundle?.items?.[0]?.locusId).toBeNull();
    expect(plan.unresolved).toEqual([
      { ref: 'Palacio pal-1 · 99', title: 'Ítem itm-ref', reason: 'not-found' },
    ]);
    expect(plan.warnings[0]).toMatch(/1 ítem sin punto/);
  });

  it('avisa de la ambigüedad con los candidatos', () => {
    const ambiguous: Catalog = {
      palaces: catalog.palaces,
      loci: [
        { id: 'a', palaceId: 'pal-1', routeNo: 1, partName: 'Codo' },
        { id: 'b', palaceId: 'pal-1', routeNo: 5, partName: 'Codo' },
      ],
    };
    const plan = planImport(withRef('Codo'), ambiguous, nothing());
    expect(plan.unresolved[0]?.reason).toBe('ambiguous');
    expect(plan.unresolved[0]?.candidates).toEqual(['Codo (#1)', 'Codo (#5)']);
  });

  it('respeta el `locusId` que ya trae el ítem', () => {
    const plan = planImport(
      { version: 1, items: [item('itm-x', 'loc-1')] },
      catalog,
      withExisting({ loci: ['loc-1'], templates: ['tpl-libre'] }),
    );
    expect(plan.bundle?.items?.[0]?.locusId).toBe('loc-1');
  });
});

describe('planImport · avisos de integridad', () => {
  it('avisa si una zona apunta a un palacio que no existe', () => {
    const plan = planImport(
      {
        version: 1,
        zones: [{ id: 'z', palaceId: 'no-existe', name: 'Z', color: 'cabeza', order: 0 }],
      },
      catalog,
      nothing(),
    );
    expect(plan.ok).toBe(true);
    expect(plan.warnings.some((w) => w.includes('palacio que no existe'))).toBe(true);
  });

  it('no avisa si el palacio viene en el mismo paquete', () => {
    const plan = planImport(
      { version: 1, palaces: [palace('pal-nuevo')], loci: [locus('loc-n', 'pal-nuevo', 1)] },
      catalog,
      nothing(),
    );
    expect(plan.warnings).toEqual([]);
  });

  it('tampoco si el palacio ya está en la base', () => {
    const plan = planImport(
      { version: 1, loci: [locus('loc-n', 'pal-1', 5)] },
      catalog,
      withExisting({ palaces: ['pal-1'] }),
    );
    expect(plan.warnings).toEqual([]);
  });

  it('avisa de la plantilla que falta', () => {
    const plan = planImport({ version: 1, items: [item('itm-x', null)] }, catalog, nothing());
    expect(plan.warnings.some((w) => w.includes('plantilla que no existe'))).toBe(true);
  });

  it('avisa de dos puntos con el mismo número de ruta', () => {
    const plan = planImport(
      {
        version: 1,
        palaces: [palace('pal-1')],
        loci: [locus('a', 'pal-1', 3), locus('b', 'pal-1', 3)],
      },
      catalog,
      nothing(),
    );
    expect(plan.warnings.some((w) => w.includes('mismo número de ruta'))).toBe(true);
  });

  it('avisa del objeto de escena huérfano', () => {
    const plan = planImport(
      { version: 1, sceneObjects: [{ id: 's', locusId: 'no-existe', text: 'Globo', order: 1 }] },
      catalog,
      nothing(),
    );
    expect(plan.warnings.some((w) => w.includes('punto que no existe'))).toBe(true);
  });
});
