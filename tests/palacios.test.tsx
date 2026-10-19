import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, db, ensurePresets, listLoci, listPalaces, listZones } from '@/db';
import { bundleSchema } from '@/io';

/**
 * El catálogo de lugares, como datos.
 *
 * La pantalla en sí se prueba en los e2e, porque todo lo suyo es red y gestos.
 * Aquí se comprueba lo que la pantalla da por bueno: que el índice cuadra con
 * las casas sueltas y que cada una entra por la puerta del import sin avisos.
 */

const dir = resolve(process.cwd(), 'seed/casas');
const indice = JSON.parse(readFileSync(resolve(dir, 'index.json'), 'utf8')) as {
  casas: {
    slug: string;
    name: string;
    puntos: number;
    zonas: number;
    habitaciones: number;
    kb: number;
  }[];
};

const casa = (slug: string): unknown =>
  JSON.parse(readFileSync(resolve(dir, `casa-${slug}.json`), 'utf8'));

beforeEach(async () => {
  await clearAll(db);
  await ensurePresets(db);
});

describe('el catálogo de lugares', () => {
  it('lista las diez casas', () => {
    expect(indice.casas).toHaveLength(10);
  });

  it('pesa poco: es lo único que se carga para enseñar la lista', () => {
    const bytes = readFileSync(resolve(dir, 'index.json')).length;
    // Unos 4 kB. El día que se dispare, hay que paginarlo.
    expect(bytes).toBeLessThan(8 * 1024);
  });

  it('cada casa suelta existe y cuadra con lo que el índice promete', () => {
    for (const entrada of indice.casas) {
      const b = bundleSchema.parse(casa(entrada.slug));
      expect(b.palaces, entrada.slug).toHaveLength(1);
      expect(b.loci, entrada.slug).toHaveLength(entrada.puntos);
      expect(b.zones, entrada.slug).toHaveLength(entrada.zonas);
      expect(b.palaces?.[0]?.name, entrada.slug).toBe(entrada.name);
      expect(b.palaces?.[0]?.rooms, entrada.slug).toHaveLength(entrada.habitaciones);
    }
  });

  it('todas son lugares con su plano, no cuerpos', () => {
    for (const entrada of indice.casas) {
      const b = bundleSchema.parse(casa(entrada.slug));
      expect(b.palaces?.[0]?.kind, entrada.slug).toBe('custom_plan');
      expect((b.palaces?.[0]?.planData?.svg ?? '').length, entrada.slug).toBeGreaterThan(1000);
    }
  });

  it('el id es el que la pantalla espera, o «Ya lo tienes» no funcionaría', () => {
    for (const entrada of indice.casas) {
      const b = bundleSchema.parse(casa(entrada.slug));
      expect(b.palaces?.[0]?.id).toBe(`pal-${entrada.slug}`);
    }
  });

  it('ninguna trae ítems: el contenido lo pones tú', () => {
    for (const entrada of indice.casas) {
      const b = bundleSchema.parse(casa(entrada.slug));
      expect(b.items ?? [], entrada.slug).toHaveLength(0);
    }
  });

  it('la suma de las sueltas es el paquete entero', () => {
    const total = indice.casas.reduce((n, c) => n + c.puntos, 0);
    const juntas = JSON.parse(readFileSync(resolve(process.cwd(), 'seed/casas.json'), 'utf8')) as {
      loci: unknown[];
      palaces: unknown[];
    };
    expect(total).toBe(juntas.loci.length);
    expect(indice.casas).toHaveLength(juntas.palaces.length);
  });
});

describe('añadir un lugar', () => {
  it('entra con sus puntos, sus zonas y su ruta en orden', async () => {
    const b = bundleSchema.parse(casa('h1'));
    const { importBundle } = await import('@/db');
    await importBundle(b as never, db);

    const palacios = await listPalaces();
    expect(palacios).toHaveLength(1);
    const palacio = palacios[0]!;
    expect(palacio.kind).toBe('custom_plan');

    const loci = await listLoci(palacio.id);
    expect(loci.length).toBeGreaterThan(130);
    expect(await listZones(palacio.id)).toHaveLength(5);

    // La ruta va 1…n sin huecos y empieza en la puerta.
    const nums = loci.map((l) => l.routeNo).sort((x, y) => x - y);
    expect(nums).toEqual(Array.from({ length: loci.length }, (_, i) => i + 1));
    expect(loci.find((l) => l.routeNo === 1)?.partName).toMatch(/puerta/i);
  });

  it('añadirla dos veces no la duplica', async () => {
    const b = bundleSchema.parse(casa('h2'));
    const { importBundle } = await import('@/db');
    await importBundle(b as never, db);
    await importBundle(b as never, db);

    expect(await listPalaces()).toHaveLength(1);
    const loci = await listLoci(`pal-h2`);
    expect(loci.length).toBeLessThan(200);
  });
});
