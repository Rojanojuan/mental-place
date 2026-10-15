import { describe, expect, it } from 'vitest';
import { R10, buildQueue, newReviewState, queueCounts } from '@/srs';
import type { QueueCandidate } from '@/srs';

const NOW = new Date(2026, 9, 15, 19, 40);
const iso = (day: number, hour: number): string => new Date(2026, 9, day, hour).toISOString();

interface Spec {
  id: string;
  dueAt?: string | null;
  stage?: number;
  routeNo?: number;
  priority?: number;
  suspended?: boolean;
}

function candidate({
  id,
  dueAt = null,
  stage = 0,
  routeNo,
  priority,
  suspended,
}: Spec): QueueCandidate {
  const out: QueueCandidate = {
    itemId: id,
    locusId: `loc-${id}`,
    state: { ...newReviewState(id, R10.id), stage, dueAt, suspended: suspended ?? false },
  };
  if (routeNo !== undefined) out.routeNo = routeNo;
  if (priority !== undefined) out.priority = priority;
  return out;
}

const ids = (queue: QueueCandidate[]): string[] => queue.map((c) => c.itemId);

describe('buildQueue · lo vencido primero', () => {
  it('ordena los vencidos por fecha, del más antiguo al más reciente', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'b', stage: 3, dueAt: iso(14, 9) }),
          candidate({ id: 'a', stage: 3, dueAt: iso(10, 9) }),
          candidate({ id: 'c', stage: 3, dueAt: iso(15, 18) }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['a', 'b', 'c']);
  });

  it('pone los vencidos antes que los nuevos', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'nuevo', stage: 0 }),
          candidate({ id: 'vencido', stage: 2, dueAt: iso(14, 9) }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['vencido', 'nuevo']);
  });

  it('deja fuera lo que todavía no vence', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'futuro', stage: 5, dueAt: new Date(2026, 9, 30, 8).toISOString() }),
          candidate({ id: 'vencido', stage: 5, dueAt: iso(14, 9) }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['vencido']);
  });
});

describe('buildQueue · desempate por prioridad', () => {
  it('desempata los vencidos de la misma fecha', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'b', stage: 3, dueAt: iso(14, 9), priority: 20 }),
          candidate({ id: 'a', stage: 3, dueAt: iso(14, 9), priority: 5 }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['a', 'b']);
  });

  it('ordena los nuevos por prioridad', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'c', priority: 30 }),
          candidate({ id: 'a', priority: 1 }),
          candidate({ id: 'b', priority: 10 }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['a', 'b', 'c']);
  });

  it('manda al final lo que no declara prioridad', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [candidate({ id: 'sin' }), candidate({ id: 'con', priority: 9 })],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['con', 'sin']);
  });

  it('es estable: a igualdad total, por id', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [candidate({ id: 'z', priority: 1 }), candidate({ id: 'a', priority: 1 })],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['a', 'z']);
  });
});

describe('buildQueue · límites', () => {
  const many = [
    candidate({ id: 'v1', stage: 3, dueAt: iso(10, 9) }),
    candidate({ id: 'v2', stage: 3, dueAt: iso(11, 9) }),
    candidate({ id: 'n1', priority: 1 }),
    candidate({ id: 'n2', priority: 2 }),
    candidate({ id: 'n3', priority: 3 }),
  ];

  it('corta los nuevos en el límite diario', () => {
    expect(ids(buildQueue({ scope: 'today', candidates: many, newLimit: 2 }, NOW))).toEqual([
      'v1',
      'v2',
      'n1',
      'n2',
    ]);
  });

  it('un límite de 0 nuevos deja solo los vencidos', () => {
    expect(ids(buildQueue({ scope: 'today', candidates: many, newLimit: 0 }, NOW))).toEqual([
      'v1',
      'v2',
    ]);
  });

  it('nunca recorta los vencidos por el límite de nuevos', () => {
    const queue = buildQueue({ scope: 'today', candidates: many, newLimit: 0 }, NOW);
    expect(queue).toHaveLength(2);
  });

  it('aplica el tope total después de ordenar', () => {
    expect(ids(buildQueue({ scope: 'today', candidates: many, limit: 3 }, NOW))).toEqual([
      'v1',
      'v2',
      'n1',
    ]);
  });

  it('sin límites, devuelve todo lo que toca', () => {
    expect(buildQueue({ scope: 'today', candidates: many }, NOW)).toHaveLength(5);
  });
});

describe('buildQueue · suspendidos y dominados', () => {
  it('deja fuera los suspendidos, aunque estén vencidos', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'pausado', stage: 3, dueAt: iso(10, 9), suspended: true }),
          candidate({ id: 'activo', stage: 3, dueAt: iso(10, 9) }),
        ],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['activo']);
  });

  it('no mete los dominados en la cola normal', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [candidate({ id: 'dominado', stage: 11, dueAt: iso(10, 9) })],
        schedule: R10,
      },
      NOW,
    );
    expect(queue).toHaveLength(0);
  });

  it('los añade al final si se piden expresamente', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'dominado', stage: 11, dueAt: iso(10, 9) }),
          candidate({ id: 'vencido', stage: 3, dueAt: iso(12, 9) }),
        ],
        schedule: R10,
        includeMastered: true,
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['vencido', 'dominado']);
  });

  it('y solo si su repaso opcional ya venció', () => {
    const queue = buildQueue(
      {
        scope: 'today',
        candidates: [
          candidate({ id: 'dominado', stage: 11, dueAt: new Date(2027, 0, 1).toISOString() }),
        ],
        schedule: R10,
        includeMastered: true,
      },
      NOW,
    );
    expect(queue).toHaveLength(0);
  });
});

describe('buildQueue · recorrido', () => {
  const walk = [
    candidate({ id: 'c', routeNo: 3, stage: 5, dueAt: new Date(2027, 0, 1).toISOString() }),
    candidate({ id: 'a', routeNo: 1 }),
    candidate({ id: 'b', routeNo: 2, stage: 11, dueAt: iso(10, 9) }),
  ];

  it('ordena por número de ruta, sin filtrar por vencimiento', () => {
    expect(ids(buildQueue({ scope: 'walk', candidates: walk, schedule: R10 }, NOW))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('ignora el límite de nuevos: el recorrido es el recorrido', () => {
    const queue = buildQueue({ scope: 'walk', candidates: walk, newLimit: 1 }, NOW);
    expect(queue).toHaveLength(3);
  });

  it('respeta el tope total', () => {
    expect(ids(buildQueue({ scope: 'walk', candidates: walk, limit: 2 }, NOW))).toEqual(['a', 'b']);
  });

  it('también deja fuera los suspendidos', () => {
    const queue = buildQueue(
      {
        scope: 'walk',
        candidates: [...walk, candidate({ id: 'pausado', routeNo: 0, suspended: true })],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['a', 'b', 'c']);
  });

  it('manda al final los puntos sin número de ruta', () => {
    const queue = buildQueue(
      {
        scope: 'walk',
        candidates: [candidate({ id: 'sin' }), candidate({ id: 'uno', routeNo: 1 })],
      },
      NOW,
    );
    expect(ids(queue)).toEqual(['uno', 'sin']);
  });
});

describe('buildQueue · los demás alcances se comportan como «hoy»', () => {
  it('punto, zona y palacio ordenan igual', () => {
    const candidates = [
      candidate({ id: 'nuevo' }),
      candidate({ id: 'vencido', stage: 2, dueAt: iso(10, 9) }),
    ];
    for (const scope of ['locus', 'zone', 'palace'] as const) {
      expect(ids(buildQueue({ scope, candidates }, NOW)), scope).toEqual(['vencido', 'nuevo']);
    }
  });
});

describe('queueCounts', () => {
  it('cuenta por estado para la pantalla de Hoy', () => {
    const counts = queueCounts(
      [
        candidate({ id: 'v1', stage: 3, dueAt: iso(10, 9) }),
        candidate({ id: 'v2', stage: 3, dueAt: iso(11, 9) }),
        candidate({ id: 'n1' }),
        candidate({ id: 'm1', stage: 11, dueAt: iso(10, 9) }),
        candidate({ id: 's1', stage: 3, dueAt: iso(10, 9), suspended: true }),
        candidate({ id: 'r1', stage: 6, dueAt: new Date(2027, 0, 1).toISOString() }),
      ],
      NOW,
      R10,
    );
    expect(counts).toEqual({ due: 2, new: 1, mastered: 1, suspended: 1 });
  });
});
