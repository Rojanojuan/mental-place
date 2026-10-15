import { describe, expect, it } from 'vitest';
import type { ReviewState } from '@/domain/types';
import {
  ADAPTIVE,
  ADAPTIVE_INITIAL_EASE,
  ADAPTIVE_MIN_EASE,
  R10,
  grade,
  newReviewState,
} from '@/srs';

const NOW = new Date(2026, 9, 15, 19, 40);

function fresh(): ReviewState {
  return newReviewState('itm-1', ADAPTIVE.id);
}

/** Un ítem cuyo último repaso se programó a un día vista. */
function afterOneDay(ease?: number): ReviewState {
  const state: ReviewState = {
    ...fresh(),
    stage: 3,
    lastReviewedAt: new Date(2026, 9, 14, 19, 40).toISOString(),
    dueAt: new Date(2026, 9, 15, 19, 40).toISOString(),
  };
  if (ease !== undefined) state.ease = ease;
  return state;
}

describe('modo adaptativo · facilidad', () => {
  it('parte de 2,5 cuando el ítem todavía no tiene facilidad', () => {
    expect(grade(fresh(), ADAPTIVE, 'good', NOW).state.ease).toBe(ADAPTIVE_INITIAL_EASE);
  });

  it('«otra vez» baja la facilidad 0,2', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'again', NOW).state.ease).toBe(2.3);
  });

  it('«difícil» la baja 0,15', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'hard', NOW).state.ease).toBe(2.35);
  });

  it('«bien» la deja igual', () => {
    expect(grade(afterOneDay(2.2), ADAPTIVE, 'good', NOW).state.ease).toBe(2.2);
  });

  it('«fácil» la sube 0,15', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'easy', NOW).state.ease).toBe(2.65);
  });

  it('nunca baja del mínimo de 1,3', () => {
    expect(grade(afterOneDay(1.4), ADAPTIVE, 'again', NOW).state.ease).toBe(ADAPTIVE_MIN_EASE);
    expect(grade(afterOneDay(1.3), ADAPTIVE, 'hard', NOW).state.ease).toBe(ADAPTIVE_MIN_EASE);
  });
});

describe('modo adaptativo · intervalos', () => {
  it('multiplica el intervalo anterior por la facilidad al acertar', () => {
    // El repaso anterior fue a 1 día: 1440 min × 2,5 = 3600 min = 2,5 d.
    const result = grade(afterOneDay(2.5), ADAPTIVE, 'good', NOW);
    expect(result.interval).toEqual({ value: 2.5, unit: 'd' });
    expect(result.proposedDueAt).toEqual(new Date(2026, 9, 18, 8, 0));
  });

  it('«difícil» lo alarga solo un 20 %', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'hard', NOW).interval).toEqual({
      value: 28.8,
      unit: 'h',
    });
  });

  it('«fácil» añade un 30 % sobre la facilidad ya subida', () => {
    // 1440 × (2,65 × 1,3) = 4961 min ≈ 3,4 d.
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'easy', NOW).interval).toEqual({
      value: 3.4,
      unit: 'd',
    });
  });

  it('«otra vez» vuelve al intervalo mínimo', () => {
    const result = grade(afterOneDay(2.5), ADAPTIVE, 'again', NOW);
    expect(result.interval).toEqual(ADAPTIVE.rules.minInterval);
    expect(result.state.stage).toBe(1);
  });

  it('un ítem nuevo arranca del primer intervalo del horario', () => {
    // Sin repaso previo: 10 min × 2,5 = 25 min.
    expect(grade(fresh(), ADAPTIVE, 'good', NOW).interval).toEqual({ value: 25, unit: 'min' });
  });

  it('parte de la fecha que el usuario fijó a mano, si la fijó', () => {
    const manual: ReviewState = {
      ...fresh(),
      stage: 2,
      ease: 2,
      lastReviewedAt: new Date(2026, 9, 15, 19, 40).toISOString(),
      dueAt: new Date(2026, 9, 25, 19, 40).toISOString(), // el usuario pidió 10 días
    };
    // 10 d × 2 = 20 d.
    expect(grade(manual, ADAPTIVE, 'good', NOW).interval).toEqual({ value: 20, unit: 'd' });
  });
});

describe('modo adaptativo · etapas', () => {
  it('avanza una etapa al acertar', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'good', NOW).state.stage).toBe(4);
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'easy', NOW).state.stage).toBe(4);
  });

  it('«difícil» se queda donde está', () => {
    expect(grade(afterOneDay(2.5), ADAPTIVE, 'hard', NOW).state.stage).toBe(3);
  });

  it('nunca declara dominado: no tiene última etapa', () => {
    let state = afterOneDay(2.5);
    for (let i = 0; i < 12; i += 1) {
      const result = grade(state, ADAPTIVE, 'good', NOW);
      expect(result.mastered).toBe(false);
      state = result.state;
    }
    expect(state.stage).toBe(15);
  });

  it('cuenta lapsos y racha igual que el modo checkpoints', () => {
    const relapse = grade({ ...afterOneDay(2.5), lapses: 1, streak: 6 }, ADAPTIVE, 'again', NOW);
    expect(relapse.state.lapses).toBe(2);
    expect(relapse.state.streak).toBe(0);
  });
});

describe('modo checkpoints · no toca la facilidad', () => {
  it('deja `ease` tal como estaba', () => {
    const withEase: ReviewState = { ...newReviewState('itm-1', R10.id), stage: 3, ease: 2.1 };
    expect(grade(withEase, R10, 'good', NOW).state.ease).toBe(2.1);
  });

  it('y no la inventa si no había', () => {
    expect(grade(newReviewState('itm-1', R10.id), R10, 'good', NOW).state).not.toHaveProperty(
      'ease',
    );
  });
});
