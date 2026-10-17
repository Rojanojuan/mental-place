import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Bundle } from '@/domain/types';
import { clearAll, db, ensurePresets, importBundle, listLoci, listZones } from '@/db';
import { bundleSchema } from '@/io';

const crudo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'seed/gramatica_c1.json'), 'utf8'),
);

describe('la semilla del Palacio 2 · Gramática C1', () => {
  it('pasa la validación del import, igual que si la pegara el usuario', () => {
    const r = bundleSchema.safeParse(crudo);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 3))).toBe(true);
  });

  it('son los 2 cuerpos de 50 puntos que pide el contrato §10.1', () => {
    const b = bundleSchema.parse(crudo);
    expect(b.palaces).toHaveLength(2);
    expect(b.loci).toHaveLength(100);
    for (const palace of b.palaces ?? []) {
      expect(b.loci?.filter((l) => l.palaceId === palace.id)).toHaveLength(50);
    }
  });

  it('cada punto dice qué elemento le toca, y ninguno se repite', () => {
    const b = bundleSchema.parse(crudo);
    const anclas = (b.loci ?? []).map((l) => l.anchor?.text);
    expect(anclas.filter((t) => t !== undefined && t !== '')).toHaveLength(100);
    expect(new Set(anclas).size).toBe(100);
  });

  it('no trae ítems: nada entra en la cola sin contenido de verdad', () => {
    const b = bundleSchema.parse(crudo);
    expect(b.items ?? []).toHaveLength(0);
  });

  it('trae la plantilla «Gramática C1» con los campos del contrato §10.6', () => {
    const b = bundleSchema.parse(crudo);
    const t = (b.templates ?? []).find((x) => x.name === 'Gramática C1');
    expect(t).toBeDefined();
    const claves = (t?.fields ?? []).map((f) => f.key);
    for (const esperada of [
      'rule',
      'definition',
      'formula',
      'conjugation',
      'parts',
      'examples',
      'typicalError',
      'exceptions',
      'confusion',
      'tip',
      'links',
    ]) {
      expect(claves).toContain(esperada);
    }
  });

  describe('al importarla', () => {
    beforeEach(async () => {
      await clearAll(db);
      await ensurePresets(db);
      // Validado arriba; aquí se importa tal cual, como haría la pantalla.
      await importBundle(crudo as Bundle, db);
    });

    it('los dos palacios quedan con sus 50 puntos y 5 zonas', async () => {
      const palacios = await db.palaces.toArray();
      expect(palacios).toHaveLength(2);
      for (const p of palacios) {
        expect(await listLoci(p.id, db)).toHaveLength(50);
        expect(await listZones(p.id, db)).toHaveLength(5);
      }
    });

    it('todo punto cuelga de una zona que existe', async () => {
      const zonas = new Set((await db.zones.toArray()).map((z) => z.id));
      for (const l of await db.loci.toArray()) {
        expect(l.zoneId === undefined || zonas.has(l.zoneId)).toBe(true);
      }
    });

    it('la ruta va de 1 a 50 en cada cuerpo, sin huecos', async () => {
      for (const p of await db.palaces.toArray()) {
        const nums = (await listLoci(p.id, db)).map((l) => l.routeNo).sort((a, b) => a - b);
        expect(nums).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
      }
    });
  });
});
