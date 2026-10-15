import { describe, expect, it } from 'vitest';
import type { Grade, Interval, ReviewState, Schedule } from '@/domain/types';
import { R10, grade, newReviewState, previewIntervals, shortcuts } from '@/srs';

const NOW = new Date(2026, 9, 15, 19, 40); // jueves 15 de octubre de 2026, 19:40

function at(stage: number, extra: Partial<ReviewState> = {}): ReviewState {
  return {
    ...newReviewState('itm-1', R10.id),
    stage,
    dueAt: stage > 0 ? new Date(2026, 9, 15, 10, 0).toISOString() : null,
    ...extra,
  };
}

const min = (value: number): Interval => ({ value, unit: 'min' });
const h = (value: number): Interval => ({ value, unit: 'h' });
const d = (value: number): Interval => ({ value, unit: 'd' });

/**
 * La tabla completa del preset R10 con las reglas por defecto
 * (`againAction: 'reset'`, `hardFactor: 0,5`, `easySkip: 2`, mínimo 10 min).
 * Cada fila: etapa de partida → [etapa resultante, intervalo aplicado].
 */
const TABLE: Record<number, Record<Grade, [number, Interval]>> = {
  0: { again: [1, min(10)], hard: [1, min(10)], good: [1, min(10)], easy: [2, d(1)] },
  1: { again: [1, min(10)], hard: [1, min(10)], good: [2, d(1)], easy: [3, d(3)] },
  2: { again: [1, min(10)], hard: [2, h(12)], good: [3, d(3)], easy: [4, d(7)] },
  3: { again: [1, min(10)], hard: [3, h(36)], good: [4, d(7)], easy: [5, d(14)] },
  4: { again: [1, min(10)], hard: [4, d(3.5)], good: [5, d(14)], easy: [6, d(30)] },
  5: { again: [1, min(10)], hard: [5, d(7)], good: [6, d(30)], easy: [7, d(60)] },
  6: { again: [1, min(10)], hard: [6, d(15)], good: [7, d(60)], easy: [8, d(90)] },
  7: { again: [1, min(10)], hard: [7, d(30)], good: [8, d(90)], easy: [9, d(180)] },
  8: { again: [1, min(10)], hard: [8, d(45)], good: [9, d(180)], easy: [10, d(365)] },
  9: { again: [1, min(10)], hard: [9, d(90)], good: [10, d(365)], easy: [11, d(365)] },
  10: { again: [1, min(10)], hard: [10, d(182.5)], good: [11, d(365)], easy: [11, d(365)] },
};

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

describe('grade · cada calificación en cada etapa de R10', () => {
  for (const [stageKey, expected] of Object.entries(TABLE)) {
    const stage = Number(stageKey);
    for (const value of GRADES) {
      const [wantStage, wantInterval] = expected[value];
      it(`etapa ${stage} · ${value} → etapa ${wantStage}, ${wantInterval.value} ${wantInterval.unit}`, () => {
        const result = grade(at(stage), R10, value, NOW);
        expect(result.state.stage).toBe(wantStage);
        expect(result.interval).toEqual(wantInterval);
        expect(result.log.stageBefore).toBe(stage);
        expect(result.log.stageAfter).toBe(wantStage);
        expect(result.log.manual).toBe(false);
        expect(result.log.dueAt).toBe(result.proposedDueAt.toISOString());
        expect(result.state.dueAt).toBe(result.proposedDueAt.toISOString());
        expect(result.state.lastReviewedAt).toBe(NOW.toISOString());
      });
    }
  }
});

describe('grade · estado de dominado', () => {
  it('marca dominado al superar el último checkpoint', () => {
    expect(grade(at(10), R10, 'good', NOW).mastered).toBe(true);
    expect(grade(at(9), R10, 'easy', NOW).mastered).toBe(true);
    expect(grade(at(10), R10, 'easy', NOW).mastered).toBe(true);
  });

  it('no lo marca mientras quede checkpoint por delante', () => {
    expect(grade(at(9), R10, 'good', NOW).mastered).toBe(false);
    expect(grade(at(10), R10, 'hard', NOW).mastered).toBe(false);
  });

  it('usa el último intervalo como repaso opcional', () => {
    const result = grade(at(10), R10, 'good', NOW);
    expect(result.interval).toEqual(d(365));
    expect(result.state.stage).toBe(11);
  });

  it('no deja crecer la etapa más allá de dominado', () => {
    const mastered = grade(at(10), R10, 'good', NOW).state;
    expect(grade(mastered, R10, 'easy', NOW).state.stage).toBe(11);
    expect(grade(mastered, R10, 'good', NOW).state.stage).toBe(11);
  });

  it('un «otra vez» lo devuelve al principio', () => {
    const mastered = grade(at(10), R10, 'good', NOW).state;
    const relapse = grade(mastered, R10, 'again', NOW);
    expect(relapse.state.stage).toBe(1);
    expect(relapse.mastered).toBe(false);
  });
});

describe('grade · reglas de «otra vez»', () => {
  const withAction = (againAction: Schedule['rules']['againAction']): Schedule => ({
    ...R10,
    rules: { ...R10.rules, againAction },
  });

  it('reset vuelve a la etapa 1 desde cualquier etapa', () => {
    for (const stage of [1, 5, 10]) {
      expect(grade(at(stage), withAction('reset'), 'again', NOW).state.stage).toBe(1);
    }
  });

  it('back1 retrocede una etapa, con la 1 como suelo', () => {
    expect(grade(at(5), withAction('back1'), 'again', NOW).state.stage).toBe(4);
    expect(grade(at(2), withAction('back1'), 'again', NOW).state.stage).toBe(1);
    expect(grade(at(1), withAction('back1'), 'again', NOW).state.stage).toBe(1);
    expect(grade(at(0), withAction('back1'), 'again', NOW).state.stage).toBe(1);
  });

  it('back2 retrocede dos etapas, con la 1 como suelo', () => {
    expect(grade(at(5), withAction('back2'), 'again', NOW).state.stage).toBe(3);
    expect(grade(at(3), withAction('back2'), 'again', NOW).state.stage).toBe(1);
    expect(grade(at(2), withAction('back2'), 'again', NOW).state.stage).toBe(1);
  });

  it('aplica el intervalo de la etapa nueva, no de la vieja', () => {
    expect(grade(at(5), withAction('back1'), 'again', NOW).interval).toEqual(d(7));
    expect(grade(at(5), withAction('back2'), 'again', NOW).interval).toEqual(d(3));
    expect(grade(at(5), withAction('reset'), 'again', NOW).interval).toEqual(min(10));
  });
});

describe('grade · lapsos y racha', () => {
  it('«otra vez» suma un lapso y corta la racha', () => {
    const result = grade(at(5, { lapses: 2, streak: 4 }), R10, 'again', NOW);
    expect(result.state.lapses).toBe(3);
    expect(result.state.streak).toBe(0);
  });

  it('las demás calificaciones alargan la racha y no tocan los lapsos', () => {
    for (const value of ['hard', 'good', 'easy'] as const) {
      const result = grade(at(5, { lapses: 2, streak: 4 }), R10, value, NOW);
      expect(result.state.lapses, value).toBe(2);
      expect(result.state.streak, value).toBe(5);
    }
  });
});

describe('grade · mínimo del horario y hora preferida', () => {
  it('nunca propone menos que el intervalo mínimo', () => {
    // La etapa 1 son 10 min; «difícil» los partiría en 5.
    expect(grade(at(1), R10, 'hard', NOW).interval).toEqual(min(10));
  });

  it('respeta un mínimo mayor configurado por el usuario', () => {
    const strict: Schedule = { ...R10, rules: { ...R10.rules, minInterval: h(1) } };
    expect(grade(at(1), strict, 'hard', NOW).interval).toEqual(h(1));
  });

  it('ancla los repasos de un día o más a la hora preferida', () => {
    const due = grade(at(1), R10, 'good', NOW).proposedDueAt;
    expect(due.getDate()).toBe(16);
    expect(due.getHours()).toBe(8);
    expect(due.getMinutes()).toBe(0);
    expect(due.getSeconds()).toBe(0);
    expect(due.getMilliseconds()).toBe(0);
  });

  it('respeta otra hora preferida', () => {
    const early: Schedule = { ...R10, rules: { ...R10.rules, dayStartHour: 6 } };
    expect(grade(at(1), early, 'good', NOW).proposedDueAt.getHours()).toBe(6);
  });

  it('deja la hora exacta en los intervalos de menos de un día', () => {
    const due = grade(at(0), R10, 'good', NOW).proposedDueAt;
    expect(due).toEqual(new Date(2026, 9, 15, 19, 50));
  });
});

describe('grade · el log', () => {
  it('deriva un id reproducible si no se le pasa uno', () => {
    const a = grade(at(1), R10, 'good', NOW).log;
    const b = grade(at(1), R10, 'good', NOW).log;
    expect(a.id).toBe(b.id);
    expect(a.id).toContain('itm-1');
  });

  it('acepta el id y la duración que le dan', () => {
    const log = grade(at(1), R10, 'good', NOW, { logId: 'log-x', durationSec: 12 }).log;
    expect(log.id).toBe('log-x');
    expect(log.durationSec).toBe(12);
  });

  it('omite la duración si no se mide', () => {
    expect(grade(at(1), R10, 'good', NOW).log).not.toHaveProperty('durationSec');
  });
});

describe('grade · no muta el estado que recibe', () => {
  it('devuelve un estado nuevo', () => {
    const before = at(3, { lapses: 1, streak: 2 });
    const snapshot = structuredClone(before);
    grade(before, R10, 'again', NOW);
    expect(before).toEqual(snapshot);
  });
});

describe('previewIntervals', () => {
  it('da las cuatro etiquetas con su fecha', () => {
    const preview = previewIntervals(at(2), R10, NOW);
    expect(preview.again.label).toBe('10 min');
    expect(preview.hard.label).toBe('12 h');
    expect(preview.good.label).toBe('3 d');
    expect(preview.easy.label).toBe('7 d');
    expect(preview.good.at.getHours()).toBe(8);
    expect(preview.hard.at).toEqual(new Date(2026, 9, 16, 7, 40));
  });

  it('avisa de que «fácil» deja el ítem dominado', () => {
    const preview = previewIntervals(at(9), R10, NOW);
    expect(preview.easy.mastered).toBe(true);
    expect(preview.good.mastered).toBe(false);
  });

  it('no cambia el estado', () => {
    const state = at(4);
    const snapshot = structuredClone(state);
    previewIntervals(state, R10, NOW);
    expect(state).toEqual(snapshot);
  });
});

describe('shortcuts de la hoja de próximo repaso', () => {
  it('ofrece los seis atajos del contrato', () => {
    const list = shortcuts(NOW, 8);
    expect(list.map((s) => s.id)).toEqual(['+10min', 'tonight', 'tomorrow', '+3d', '+1w', '+1mo']);
    expect(list.map((s) => s.label)).toEqual([
      '+10 min',
      'Esta noche',
      'Mañana',
      '+3 d',
      '+1 sem',
      '+1 mes',
    ]);
  });

  it('calcula cada atajo desde la hora actual', () => {
    const byId = new Map(shortcuts(NOW, 8).map((s) => [s.id, s.at]));
    expect(byId.get('+10min')).toEqual(new Date(2026, 9, 15, 19, 50));
    expect(byId.get('tonight')).toEqual(new Date(2026, 9, 15, 21, 0));
    expect(byId.get('tomorrow')).toEqual(new Date(2026, 9, 16, 8, 0));
    expect(byId.get('+3d')).toEqual(new Date(2026, 9, 18, 8, 0));
    expect(byId.get('+1w')).toEqual(new Date(2026, 9, 22, 8, 0));
    expect(byId.get('+1mo')).toEqual(new Date(2026, 10, 15, 8, 0));
  });

  it('pasa «esta noche» a mañana si ya es más tarde', () => {
    const late = new Date(2026, 9, 15, 23, 30);
    const tonight = shortcuts(late, 8).find((s) => s.id === 'tonight');
    expect(tonight?.at).toEqual(new Date(2026, 9, 16, 21, 0));
  });
});
