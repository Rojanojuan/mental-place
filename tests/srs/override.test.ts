import { describe, expect, it } from 'vitest';
import type { ReviewState } from '@/domain/types';
import { R10, grade, newReviewState, override } from '@/srs';

const NOW = new Date(2026, 9, 15, 19, 40);

function at(stage: number): ReviewState {
  return { ...newReviewState('itm-1', R10.id), stage, streak: 3, lapses: 1 };
}

describe('override · fecha y hora exactas', () => {
  it('fija justo la fecha que pide el usuario', () => {
    const target = new Date(2026, 11, 24, 23, 15);
    const result = override(at(4), R10, { at: target }, NOW);
    expect(result.proposedDueAt).toEqual(target);
    expect(result.state.dueAt).toBe(target.toISOString());
  });

  it('no toca la etapa ni declara intervalo', () => {
    const result = override(at(4), R10, { at: new Date(2026, 11, 24) }, NOW);
    expect(result.state.stage).toBe(4);
    expect(result.interval).toBeNull();
    expect(result.log.intervalApplied).toBeNull();
  });

  it('no mueve la hora a la preferida', () => {
    const target = new Date(2026, 11, 24, 23, 15);
    expect(override(at(4), R10, { at: target }, NOW).proposedDueAt.getHours()).toBe(23);
  });

  it('acepta una fecha en el pasado (el ítem queda vencido)', () => {
    const past = new Date(2026, 9, 14, 9, 0);
    expect(override(at(4), R10, { at: past }, NOW).proposedDueAt).toEqual(past);
  });
});

describe('override · sumar un intervalo', () => {
  it('ancla a la hora preferida si es de un día o más', () => {
    const result = override(at(2), R10, { addInterval: { value: 3, unit: 'd' } }, NOW);
    expect(result.proposedDueAt).toEqual(new Date(2026, 9, 18, 8, 0));
    expect(result.interval).toEqual({ value: 3, unit: 'd' });
  });

  it('deja la hora exacta si es de menos de un día', () => {
    const result = override(at(2), R10, { addInterval: { value: 10, unit: 'min' } }, NOW);
    expect(result.proposedDueAt).toEqual(new Date(2026, 9, 15, 19, 50));
  });

  it('no cambia la etapa', () => {
    const result = override(at(7), R10, { addInterval: { value: 1, unit: 'w' } }, NOW);
    expect(result.state.stage).toBe(7);
  });
});

describe('override · saltar a una etapa', () => {
  it('recalcula la fecha desde el checkpoint elegido', () => {
    const result = override(at(1), R10, { stage: 5 }, NOW);
    expect(result.state.stage).toBe(5);
    expect(result.interval).toEqual({ value: 14, unit: 'd' });
    expect(result.proposedDueAt).toEqual(new Date(2026, 9, 29, 8, 0));
  });

  it('también sirve para retroceder', () => {
    const result = override(at(8), R10, { stage: 2 }, NOW);
    expect(result.state.stage).toBe(2);
    expect(result.interval).toEqual({ value: 1, unit: 'd' });
  });

  it('acota la etapa al rango del horario', () => {
    expect(override(at(4), R10, { stage: 0 }, NOW).state.stage).toBe(1);
    expect(override(at(4), R10, { stage: -3 }, NOW).state.stage).toBe(1);
    expect(override(at(4), R10, { stage: 99 }, NOW).state.stage).toBe(11);
  });

  it('declara dominado si se salta más allá del último checkpoint', () => {
    const result = override(at(4), R10, { stage: 11 }, NOW);
    expect(result.mastered).toBe(true);
    expect(result.interval).toEqual({ value: 365, unit: 'd' });
  });

  it('trunca una etapa fraccionaria', () => {
    expect(override(at(4), R10, { stage: 3.7 }, NOW).state.stage).toBe(3);
  });
});

describe('override · el log', () => {
  it('marca manual = true', () => {
    expect(override(at(4), R10, { stage: 6 }, NOW).log.manual).toBe(true);
  });

  it('guarda la calificación que dio el usuario antes de ajustar', () => {
    const log = override(at(4), R10, { stage: 6 }, NOW, { grade: 'hard' }).log;
    expect(log.grade).toBe('hard');
  });

  it('conserva la etapa de partida que se le pasa', () => {
    const log = override(at(5), R10, { stage: 7 }, NOW, { stageBefore: 4 }).log;
    expect(log.stageBefore).toBe(4);
    expect(log.stageAfter).toBe(7);
  });

  it('usa la etapa actual como partida si no se la pasan', () => {
    expect(override(at(5), R10, { stage: 7 }, NOW).log.stageBefore).toBe(5);
  });

  it('registra la fecha fijada', () => {
    const target = new Date(2026, 11, 24, 10, 0);
    expect(override(at(4), R10, { at: target }, NOW).log.dueAt).toBe(target.toISOString());
  });
});

describe('override · encadenado tras calificar', () => {
  it('el horario continúa desde la etapa elegida a mano', () => {
    // El usuario califica «bien» en la etapa 2 (propuesta: 3 d) pero prefiere
    // saltar a la etapa 6, y el siguiente repaso ya sigue desde ahí.
    const graded = grade(at(2), R10, 'good', NOW);
    expect(graded.state.stage).toBe(3);

    const fixed = override(graded.state, R10, { stage: 6 }, NOW, {
      grade: 'good',
      stageBefore: 2,
    });
    expect(fixed.state.stage).toBe(6);

    const later = new Date(2026, 10, 14, 8, 0);
    const next = grade(fixed.state, R10, 'good', later);
    expect(next.state.stage).toBe(7);
    expect(next.interval).toEqual({ value: 60, unit: 'd' });
  });

  it('no altera los lapsos ni la racha', () => {
    const result = override(at(4), R10, { stage: 6 }, NOW);
    expect(result.state.lapses).toBe(1);
    expect(result.state.streak).toBe(3);
  });

  it('anota la fecha de revisión', () => {
    expect(override(at(4), R10, { stage: 6 }, NOW).state.lastReviewedAt).toBe(NOW.toISOString());
  });

  it('no muta el estado que recibe', () => {
    const before = at(4);
    const snapshot = structuredClone(before);
    override(before, R10, { stage: 9 }, NOW);
    expect(before).toEqual(snapshot);
  });
});
