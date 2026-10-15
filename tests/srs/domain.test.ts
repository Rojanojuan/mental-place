import { describe, expect, it } from 'vitest';
import { PALACE_STYLE_DEFAULTS } from '@/domain/types';
import { CLASSIC, PRESETS, QUICK_EXAM, R10, findPreset, newReviewState } from '@/srs';

describe('valores por defecto de la apariencia del cuerpo', () => {
  it('coinciden con la tabla de PROMPT_MEJORAS §2', () => {
    expect(PALACE_STYLE_DEFAULTS).toEqual({
      accent: 'cabeza',
      draw: 'atlas',
      skin: 'neutral',
      hair: 'none',
      hairColor: 'var(--line-2)',
      facial: 'none',
      glasses: false,
      detail: 'full',
      vol: 'shade',
      line: 'fine',
    });
  });
});

describe('newReviewState', () => {
  it('arranca un ítem sin estudiar', () => {
    expect(newReviewState('itm-1', 'sch-r10')).toEqual({
      itemId: 'itm-1',
      scheduleId: 'sch-r10',
      stage: 0,
      dueAt: null,
      lapses: 0,
      streak: 0,
      suspended: false,
    });
  });
});

describe('presets del contrato §4.1', () => {
  it('R10 son los diez checkpoints de 10 min a un año', () => {
    expect(R10.intervals.map((i) => `${i.value}${i.unit}`)).toEqual([
      '10min',
      '1d',
      '3d',
      '7d',
      '14d',
      '30d',
      '60d',
      '90d',
      '180d',
      '365d',
    ]);
    expect(R10.rules).toEqual({
      againAction: 'reset',
      hardFactor: 0.5,
      easySkip: 2,
      minInterval: { value: 10, unit: 'min' },
      dayStartHour: 8,
    });
  });

  it('«Rápido examen» va de 1 h a 2 semanas', () => {
    expect(QUICK_EXAM.intervals.map((i) => `${i.value}${i.unit}`)).toEqual([
      '1h',
      '1d',
      '2d',
      '4d',
      '7d',
      '14d',
    ]);
  });

  it('«Clásico» es 1-3-7-14-30', () => {
    expect(CLASSIC.intervals.map((i) => i.value)).toEqual([1, 3, 7, 14, 30]);
    expect(CLASSIC.intervals.every((i) => i.unit === 'd')).toBe(true);
  });

  it('incluye los cinco presets, con ids únicos', () => {
    expect(PRESETS).toHaveLength(5);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(5);
    expect(PRESETS.map((p) => p.name)).toEqual([
      'R10',
      'Rápido examen',
      'Clásico 1-3-7-14-30',
      'Adaptativo (tipo SM-2)',
      'Personalizado',
    ]);
  });

  it('todos declaran al menos un intervalo', () => {
    for (const preset of PRESETS) {
      expect(preset.intervals.length, preset.name).toBeGreaterThan(0);
    }
  });

  it('se buscan por id', () => {
    expect(findPreset('sch-r10')).toBe(R10);
    expect(findPreset('no-existe')).toBeUndefined();
  });
});
