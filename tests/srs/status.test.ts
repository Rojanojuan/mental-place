import { describe, expect, it } from 'vitest';
import type { LocusState, ReviewState } from '@/domain/types';
import { R10, compareUrgency, itemStatus, locusStatus, newReviewState } from '@/srs';

const NOW = new Date(2026, 9, 15, 19, 40);
const past = new Date(2026, 9, 15, 10, 0).toISOString();
const future = new Date(2026, 9, 20, 8, 0).toISOString();

function state(partial: Partial<ReviewState>): ReviewState {
  return { ...newReviewState('itm-1', R10.id), ...partial };
}

describe('itemStatus', () => {
  it('«suspended» manda sobre todo lo demás', () => {
    expect(itemStatus(state({ suspended: true, stage: 2, dueAt: past }), NOW, R10)).toBe(
      'suspended',
    );
  });

  it('«new» mientras no se haya estudiado nunca', () => {
    expect(itemStatus(state({ stage: 0, dueAt: null }), NOW, R10)).toBe('new');
  });

  it('«due» cuando la fecha ya pasó', () => {
    expect(itemStatus(state({ stage: 4, dueAt: past }), NOW, R10)).toBe('due');
  });

  it('«due» también justo en el instante del vencimiento', () => {
    expect(itemStatus(state({ stage: 4, dueAt: NOW.toISOString() }), NOW, R10)).toBe('due');
  });

  it('«learning» en las etapas 1 a 3', () => {
    for (const stage of [1, 2, 3]) {
      expect(itemStatus(state({ stage, dueAt: future }), NOW, R10)).toBe('learning');
    }
  });

  it('«review» en las etapas intermedias', () => {
    for (const stage of [4, 7, 10]) {
      expect(itemStatus(state({ stage, dueAt: future }), NOW, R10)).toBe('review');
    }
  });

  it('«mastered» pasado el último checkpoint', () => {
    expect(itemStatus(state({ stage: 11, dueAt: future }), NOW, R10)).toBe('mastered');
  });

  it('un dominado no se pinta como vencido: su repaso es opcional', () => {
    expect(itemStatus(state({ stage: 11, dueAt: past }), NOW, R10)).toBe('mastered');
  });

  it('sin horario no puede distinguir dominado de al día', () => {
    expect(itemStatus(state({ stage: 11, dueAt: future }), NOW)).toBe('review');
  });
});

describe('locusStatus · el estado más urgente de sus ítems', () => {
  it('sin ítems, el punto está vacío', () => {
    expect(locusStatus([])).toBe('empty');
  });

  it('respeta el orden del contrato: due > learning > new > review > mastered', () => {
    expect(locusStatus(['mastered', 'review', 'new', 'learning', 'due'])).toBe('due');
    expect(locusStatus(['mastered', 'review', 'new', 'learning'])).toBe('learning');
    expect(locusStatus(['mastered', 'review', 'new'])).toBe('new');
    expect(locusStatus(['mastered', 'review'])).toBe('review');
    expect(locusStatus(['mastered'])).toBe('mastered');
  });

  it('solo dice «suspended» si no hay nada más vivo', () => {
    expect(locusStatus(['suspended', 'suspended'])).toBe('suspended');
    expect(locusStatus(['suspended', 'mastered'])).toBe('mastered');
    expect(locusStatus(['suspended', 'due'])).toBe('due');
  });

  it('un solo ítem decide el estado del punto', () => {
    for (const only of ['new', 'learning', 'due', 'review', 'mastered'] as LocusState[]) {
      expect(locusStatus([only])).toBe(only);
    }
  });
});

describe('compareUrgency', () => {
  it('ordena de más urgente a menos', () => {
    const states: LocusState[] = ['empty', 'mastered', 'due', 'new', 'review', 'learning'];
    expect([...states].sort(compareUrgency)).toEqual([
      'due',
      'learning',
      'new',
      'review',
      'mastered',
      'empty',
    ]);
  });
});
