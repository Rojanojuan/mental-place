import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Bundle, Item, Locus } from '@/domain/types';

// En entorno jsdom `import.meta.url` no es una URL de archivo; Vitest corre
// con el directorio de trabajo en la raíz del proyecto.
const SEED = resolve(process.cwd(), 'seed/fonetica45.json');
const bundle = JSON.parse(readFileSync(SEED, 'utf8')) as Bundle;

const loci: Locus[] = bundle.loci ?? [];
const items: Item[] = bundle.items ?? [];
const itemByLocus = new Map(items.map((i) => [i.locusId, i]));

/** El punto 34 (Tobillo · /s/) no tiene sección en el Word. Ver docs/INGESTA_FONETICA.md. */
const MISSING_ROUTE = 34;
/** La sección 42 (Cintura · /ŋ/) no trae tabla de patrones en el Word. */
const NO_PATTERNS_ROUTE = 42;

describe('semilla de fonética · estructura', () => {
  it('es un paquete JSON v1 con todas las colecciones', () => {
    expect(bundle.version).toBe(1);
    expect(bundle.palaces).toHaveLength(1);
    expect(bundle.zones).toHaveLength(5);
    expect(bundle.templates).toHaveLength(1);
    expect(bundle.decks).toHaveLength(1);
    expect(bundle.schedules).toHaveLength(1);
  });

  it('tiene los 45 puntos de la plantilla Estándar 45 y 44 ítems', () => {
    expect(loci).toHaveLength(45);
    expect(items).toHaveLength(44);
  });

  it('numera la ruta 1…45 sin huecos ni repetidos', () => {
    expect([...loci].map((l) => l.routeNo).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 45 }, (_, i) => i + 1),
    );
  });

  it('coloca cada punto dentro del rango normalizado 0–1', () => {
    for (const l of loci) {
      expect(l.pos.x, l.partName).toBeGreaterThanOrEqual(0);
      expect(l.pos.x, l.partName).toBeLessThanOrEqual(1);
      expect(l.pos.y, l.partName).toBeGreaterThanOrEqual(0);
      expect(l.pos.y, l.partName).toBeLessThanOrEqual(1);
    }
  });

  it('deja sin ítem solo el punto que falta en el documento', () => {
    const empty = loci.filter((l) => !itemByLocus.has(l.id));
    expect(empty.map((l) => l.routeNo)).toEqual([MISSING_ROUTE]);
    expect(empty[0]?.notes).toMatch(/falta la sección/i);
  });
});

describe('semilla de fonética · integridad referencial', () => {
  it('apunta cada ítem a un punto que existe', () => {
    const ids = new Set(loci.map((l) => l.id));
    for (const i of items) {
      expect(i.locusId === null || ids.has(i.locusId), i.title).toBe(true);
    }
  });

  it('apunta cada punto y cada zona a su palacio', () => {
    const palaceId = bundle.palaces?.[0]?.id;
    const zoneIds = new Set((bundle.zones ?? []).map((z) => z.id));
    for (const l of loci) {
      expect(l.palaceId).toBe(palaceId);
      expect(l.zoneId !== undefined && zoneIds.has(l.zoneId), l.partName).toBe(true);
    }
    for (const z of bundle.zones ?? []) expect(z.palaceId).toBe(palaceId);
  });

  it('apunta cada objeto de escena a un punto, con 5 como máximo por punto', () => {
    const ids = new Set(loci.map((l) => l.id));
    const perLocus = new Map<string, number>();
    for (const s of bundle.sceneObjects ?? []) {
      expect(ids.has(s.locusId)).toBe(true);
      perLocus.set(s.locusId, (perLocus.get(s.locusId) ?? 0) + 1);
    }
    for (const [locusId, count] of perLocus) expect(count, locusId).toBeLessThanOrEqual(5);
  });

  it('usa la plantilla y el mazo declarados', () => {
    const templateId = bundle.templates?.[0]?.id;
    const deckId = bundle.decks?.[0]?.id;
    for (const i of items) {
      expect(i.templateId).toBe(templateId);
      expect(i.deckId).toBe(deckId);
    }
  });
});

describe('semilla de fonética · contenido', () => {
  it('da a cada ítem título, anverso, reverso y bloques', () => {
    for (const i of items) {
      expect(i.title.length, i.id).toBeGreaterThan(3);
      expect(i.front?.length ?? 0, i.id).toBeGreaterThan(3);
      expect(i.back?.length ?? 0, i.id).toBeGreaterThan(3);
      expect(i.blocks.length, i.id).toBeGreaterThan(0);
      expect(i.origin).toBe('import');
    }
  });

  it('normaliza el símbolo del sonido a IPA en minúscula', () => {
    for (const i of items) {
      const sound = i.fields.sound;
      expect(typeof sound, i.id).toBe('string');
      // Los glifos IPA en mayúscula del documento (Ɔ, Ʌ, Ʊ, Ə, W…) no deben sobrevivir.
      expect(sound as string, i.id).not.toMatch(/[A-ZƆɅƱƏ]/u);
    }
  });

  it('conserva la palabra clave de cada sonido', () => {
    for (const i of items) {
      const kw = i.fields.keyword as { en: string; es: string } | null;
      expect(kw, i.id).not.toBeNull();
      expect(kw?.en.length ?? 0, i.id).toBeGreaterThan(0);
      expect(kw?.es.length ?? 0, i.id).toBeGreaterThan(0);
    }
  });

  it('trae al menos un grupo de patrón, salvo la sección sin tabla', () => {
    for (const i of items) {
      const route = i.fields.routeNo as number;
      const count = i.fields.patternCount as number;
      if (route === NO_PATTERNS_ROUTE) expect(count).toBe(0);
      else expect(count, i.title).toBeGreaterThan(0);
    }
  });

  it('solo indexa enlaces del diccionario de Cambridge', () => {
    let total = 0;
    for (const i of items) {
      const links = i.fields.links as Record<string, string>;
      for (const url of Object.values(links)) {
        expect(url).toMatch(/^https:\/\/dictionary\.cambridge\.org\//);
        total += 1;
      }
    }
    expect(total).toBeGreaterThan(1000);
  });

  it('declara el horario R10 con los 10 checkpoints y la hora preferida', () => {
    const schedule = bundle.schedules?.[0];
    expect(schedule?.mode).toBe('checkpoints');
    expect(schedule?.intervals).toHaveLength(10);
    expect(schedule?.intervals[0]).toEqual({ value: 10, unit: 'min' });
    expect(schedule?.intervals[9]).toEqual({ value: 365, unit: 'd' });
    expect(schedule?.rules.dayStartHour).toBe(8);
  });

  it('no deja ninguna tabla vacía ni sin cabecera', () => {
    for (const i of items) {
      for (const block of i.blocks) {
        if (block.type !== 'table') continue;
        expect(block.columns.length, i.id).toBeGreaterThan(1);
        expect(block.rows.length, `${i.id} · ${block.caption ?? ''}`).toBeGreaterThan(0);
        for (const row of block.rows) expect(row).toHaveLength(block.columns.length);
      }
    }
  });
});
