import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Bundle, Locus, Palace } from '@/domain/types';
import {
  clearAll,
  db,
  ensurePresets,
  getCurrentPalace,
  importBundle,
  listLoci,
  setCurrentPalace,
} from '@/db';
import { COLLECTIONS, type ExistingIds, planImport } from '@/io';
import { Inspector } from '@/features/inspector/Inspector';
import { renderAt } from './render';

const casas = JSON.parse(readFileSync(resolve(process.cwd(), 'seed/casas.json'), 'utf8')) as Bundle;

const palaces: Palace[] = casas.palaces ?? [];
const loci: Locus[] = casas.loci ?? [];

describe('semilla de casas · estructura', () => {
  it('trae las diez casas del traspaso', () => {
    expect(palaces).toHaveLength(10);
    expect(casas.zones).toHaveLength(50);
    expect(loci).toHaveLength(1363);
  });

  it('las declara como planos, no como cuerpos', () => {
    for (const palace of palaces) {
      expect(palace.kind, palace.name).toBe('custom_plan');
      expect(palace.planData?.svg.length ?? 0, palace.name).toBeGreaterThan(1000);
      expect(palace.aspect, palace.name).toBeGreaterThan(0);
      expect((palace.rooms ?? []).length, palace.name).toBeGreaterThanOrEqual(12);
    }
  });

  it('cada casa tiene al menos 130 puntos, como pide el diseño', () => {
    for (const palace of palaces) {
      const count = loci.filter((locus) => locus.palaceId === palace.id).length;
      expect(count, palace.name).toBeGreaterThanOrEqual(130);
    }
  });

  it('empieza la ruta en la puerta principal (regla 1 de §4.2)', () => {
    for (const palace of palaces) {
      const first = loci.find((locus) => locus.palaceId === palace.id && locus.routeNo === 1);
      expect(first?.partName, palace.name).toBe('Puerta principal');
    }
  });

  it('numera cada ruta 1…n sin huecos ni repetidos', () => {
    for (const palace of palaces) {
      const numbers = loci
        .filter((locus) => locus.palaceId === palace.id)
        .map((locus) => locus.routeNo)
        .sort((a, b) => a - b);
      expect(numbers[0], palace.name).toBe(1);
      expect(new Set(numbers).size, palace.name).toBe(numbers.length);
      expect(numbers.at(-1), palace.name).toBe(numbers.length);
    }
  });

  it('pone cada punto dentro de su plano y le da habitación', () => {
    for (const locus of loci) {
      expect(locus.pos.x).toBeGreaterThanOrEqual(0);
      expect(locus.pos.x).toBeLessThanOrEqual(1);
      expect(locus.pos.y).toBeGreaterThanOrEqual(0);
      expect(locus.pos.y).toBeLessThanOrEqual(1);
      expect(typeof locus.room, locus.partName).toBe('string');
    }
  });

  it('no trae ítems: las casas vienen amuebladas pero vacías', () => {
    expect(casas.items).toBeUndefined();
  });
});

describe('semilla de casas · pasa la validación de importación', () => {
  it('cumple el esquema Zod del formato v1', () => {
    const existing = Object.fromEntries(
      COLLECTIONS.map((name) => [name, new Set<string>()]),
    ) as ExistingIds;
    const plan = planImport(casas, { palaces: [], loci: [] }, existing);

    expect(plan.errors).toEqual([]);
    expect(plan.ok).toBe(true);
    expect(plan.diff.palaces.create).toBe(10);
    expect(plan.diff.loci.create).toBe(1363);
  });

  it('no deja referencias colgando', () => {
    const existing = Object.fromEntries(
      COLLECTIONS.map((name) => [name, new Set<string>()]),
    ) as ExistingIds;
    const plan = planImport(casas, { palaces: [], loci: [] }, existing);
    expect(plan.warnings).toEqual([]);
  });
});

describe('las casas en la app', () => {
  beforeEach(async () => {
    await clearAll(db);
    await importBundle(casas, db);
    await ensurePresets(db);
  });

  it('entran enteras en la base de datos', async () => {
    expect(await db.palaces.count()).toBe(10);
    expect(await db.loci.count()).toBe(1363);
    const casaFamiliar = await listLoci('pal-h1', db);
    expect(casaFamiliar).toHaveLength(136);
    expect(casaFamiliar[0]?.partName).toBe('Puerta principal');
  });

  it('el palacio elegido se recuerda', async () => {
    await setCurrentPalace('pal-h3', db);
    expect((await getCurrentPalace(db))?.id).toBe('pal-h3');
  });

  it('cae al primero si el elegido ya no existe', async () => {
    await setCurrentPalace('pal-borrado', db);
    const current = await getCurrentPalace(db);
    expect(current).toBeDefined();
    expect(current?.id).toBe('pal-h1');
  });

  it('el mapa pinta el plano en vez de las siluetas', async () => {
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/136 puntos · 0 con contenido/);

    const svg = document.querySelector('.bodymap');
    // El lienzo toma las medidas del plano, no las del cuerpo (444×480).
    expect(svg?.getAttribute('viewBox')).toBe('0 0 720 430');
    expect(document.querySelector('.plan')).not.toBeNull();
    expect(document.querySelector('.body')).toBeNull();
  });

  it('deja cambiar de palacio con los chips', async () => {
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/136 puntos · 0 con contenido/);

    // Los chips consultan por su cuenta, aparte del mapa: con la suite entera
    // en marcha no llegan dentro del segundo que da `findBy` por defecto.
    const chip = await screen.findByRole(
      'button',
      { name: /Mansión victoriana/ },
      { timeout: 10_000 },
    );
    await userEvent.click(chip);

    // El título sigue al palacio enseguida; el mapa recarga sus 165 puntos
    // después, y eso no es lo que este test comprueba.
    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: /Mansión victoriana/ },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect((await getCurrentPalace(db))?.id).toBe('pal-h10');
  });
});
