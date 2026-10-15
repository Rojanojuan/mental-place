import { describe, expect, it } from 'vitest';
import {
  addInterval,
  atDayStart,
  formatInterval,
  fromMinutes,
  maxInterval,
  nextDue,
  scaleInterval,
  spansADay,
  projectIntervals,
  toMinutes,
} from '@/srs';

/** La zona de los tests se fija en vite.config.ts: Europe/Madrid (tiene DST). */
describe('zona horaria de los tests', () => {
  it('corre en una zona con horario de verano', () => {
    const winter = new Date(2026, 0, 15, 12, 0).getTimezoneOffset();
    const summer = new Date(2026, 6, 15, 12, 0).getTimezoneOffset();
    expect(winter).not.toBe(summer);
  });
});

describe('toMinutes', () => {
  it('convierte cada unidad', () => {
    expect(toMinutes({ value: 10, unit: 'min' })).toBe(10);
    expect(toMinutes({ value: 2, unit: 'h' })).toBe(120);
    expect(toMinutes({ value: 3, unit: 'd' })).toBe(4320);
    expect(toMinutes({ value: 2, unit: 'w' })).toBe(20160);
    expect(toMinutes({ value: 1, unit: 'mo' })).toBe(43200);
  });
});

describe('fromMinutes', () => {
  it('usa minutos por debajo de una hora', () => {
    expect(fromMinutes(10)).toEqual({ value: 10, unit: 'min' });
    expect(fromMinutes(59)).toEqual({ value: 59, unit: 'min' });
  });

  it('usa horas hasta dos días', () => {
    expect(fromMinutes(60)).toEqual({ value: 1, unit: 'h' });
    expect(fromMinutes(720)).toEqual({ value: 12, unit: 'h' });
    expect(fromMinutes(2160)).toEqual({ value: 36, unit: 'h' });
  });

  it('usa días a partir de dos días, con un decimal', () => {
    expect(fromMinutes(2880)).toEqual({ value: 2, unit: 'd' });
    expect(fromMinutes(5040)).toEqual({ value: 3.5, unit: 'd' });
    expect(fromMinutes(21600)).toEqual({ value: 15, unit: 'd' });
    expect(fromMinutes(262800)).toEqual({ value: 182.5, unit: 'd' });
  });

  it('nunca baja de un minuto', () => {
    expect(fromMinutes(0)).toEqual({ value: 1, unit: 'min' });
    expect(fromMinutes(-5)).toEqual({ value: 1, unit: 'min' });
  });
});

describe('scaleInterval', () => {
  it('parte un intervalo por la mitad y lo renormaliza', () => {
    expect(scaleInterval({ value: 1, unit: 'd' }, 0.5)).toEqual({ value: 12, unit: 'h' });
    expect(scaleInterval({ value: 14, unit: 'd' }, 0.5)).toEqual({ value: 7, unit: 'd' });
    expect(scaleInterval({ value: 10, unit: 'min' }, 0.5)).toEqual({ value: 5, unit: 'min' });
  });
});

describe('maxInterval y spansADay', () => {
  it('devuelve el mayor de dos intervalos', () => {
    expect(maxInterval({ value: 5, unit: 'min' }, { value: 10, unit: 'min' })).toEqual({
      value: 10,
      unit: 'min',
    });
    expect(maxInterval({ value: 2, unit: 'd' }, { value: 1, unit: 'h' })).toEqual({
      value: 2,
      unit: 'd',
    });
  });

  it('detecta los intervalos de un día o más', () => {
    expect(spansADay({ value: 1440, unit: 'min' })).toBe(true);
    expect(spansADay({ value: 1, unit: 'd' })).toBe(true);
    expect(spansADay({ value: 23, unit: 'h' })).toBe(false);
  });
});

describe('addInterval', () => {
  it('suma cantidades fraccionarias en minutos', () => {
    const from = new Date(2026, 9, 15, 10, 0);
    expect(addInterval(from, { value: 3.5, unit: 'd' })).toEqual(new Date(2026, 9, 18, 22, 0));
    expect(addInterval(from, { value: 1.5, unit: 'h' })).toEqual(new Date(2026, 9, 15, 11, 30));
  });

  it('suma meses con aritmética de calendario', () => {
    expect(addInterval(new Date(2026, 0, 31, 9, 0), { value: 1, unit: 'mo' })).toEqual(
      new Date(2026, 1, 28, 9, 0),
    );
  });
});

describe('atDayStart', () => {
  it('lleva la fecha a la hora preferida del mismo día', () => {
    const result = atDayStart(new Date(2026, 9, 16, 19, 40, 30, 500), 8);
    expect(result).toEqual(new Date(2026, 9, 16, 8, 0, 0, 0));
  });
});

describe('nextDue', () => {
  it('ancla los intervalos de un día o más a la hora preferida', () => {
    const now = new Date(2026, 9, 15, 19, 40);
    expect(nextDue(now, { value: 1, unit: 'd' }, 8)).toEqual(new Date(2026, 9, 16, 8, 0, 0, 0));
    expect(nextDue(now, { value: 3, unit: 'd' }, 8)).toEqual(new Date(2026, 9, 18, 8, 0, 0, 0));
  });

  it('deja intactos los intervalos de menos de un día', () => {
    const now = new Date(2026, 9, 15, 19, 40);
    expect(nextDue(now, { value: 10, unit: 'min' }, 8)).toEqual(new Date(2026, 9, 15, 19, 50));
    expect(nextDue(now, { value: 1, unit: 'h' }, 8)).toEqual(new Date(2026, 9, 15, 20, 40));
  });
});

describe('cambio de horario (DST)', () => {
  // En Europe/Madrid los relojes se adelantan el 29 de marzo de 2026 a las 2:00.
  it('mantiene la hora local al cruzar al horario de verano', () => {
    const before = new Date(2026, 2, 28, 19, 40); // sábado, CET (UTC+1)
    const due = nextDue(before, { value: 1, unit: 'd' }, 8);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(2);
    expect(due.getDate()).toBe(29);
    expect(due.getHours()).toBe(8); // 8:00 locales, ya en CEST
    expect(due.getUTCHours()).toBe(6); // y por tanto 6:00 UTC
  });

  it('mantiene la hora local al volver al horario de invierno', () => {
    // Los relojes se atrasan el 25 de octubre de 2026 a las 3:00.
    const before = new Date(2026, 9, 24, 19, 40); // CEST (UTC+2)
    const due = nextDue(before, { value: 1, unit: 'd' }, 8);
    expect(due.getDate()).toBe(25);
    expect(due.getHours()).toBe(8);
    expect(due.getUTCHours()).toBe(7); // 8:00 CET = 7:00 UTC
  });

  it('suma los minutos en tiempo absoluto, saltando la hora que no existe', () => {
    // 01:55 CET + 10 min cae en las 02:05, que no existe: son las 03:05 CEST.
    const before = new Date(2026, 2, 29, 1, 55);
    const after = addInterval(before, { value: 10, unit: 'min' });
    expect(after.getTime() - before.getTime()).toBe(10 * 60_000);
    expect(after.getHours()).toBe(3);
    expect(after.getMinutes()).toBe(5);
  });

  it('cuenta 7 días de calendario aunque el tramo tenga una hora menos', () => {
    const before = new Date(2026, 9, 21, 8, 0); // CEST
    const due = nextDue(before, { value: 7, unit: 'd' }, 8);
    expect(due.getDate()).toBe(28);
    expect(due.getHours()).toBe(8); // CET
    // 7 días de calendario que duran 7×24 h + 1 h de reloj.
    expect(due.getTime() - before.getTime()).toBe((7 * 24 + 1) * 3_600_000);
  });
});

describe('formatInterval', () => {
  it('escribe las etiquetas de los botones en español', () => {
    expect(formatInterval({ value: 10, unit: 'min' })).toBe('10 min');
    expect(formatInterval({ value: 12, unit: 'h' })).toBe('12 h');
    expect(formatInterval({ value: 1, unit: 'd' })).toBe('1 d');
    expect(formatInterval({ value: 3.5, unit: 'd' })).toBe('3,5 d');
    expect(formatInterval({ value: 2, unit: 'w' })).toBe('2 sem');
    expect(formatInterval({ value: 1, unit: 'mo' })).toBe('1 mes');
    expect(formatInterval({ value: 3, unit: 'mo' })).toBe('3 meses');
  });
});

describe('projectIntervals', () => {
  it('acumula las fechas de cada etapa como si se aprobara siempre', () => {
    const now = new Date(2026, 9, 15, 19, 40);
    const plan = projectIntervals(
      [
        { value: 10, unit: 'min' },
        { value: 1, unit: 'd' },
        { value: 3, unit: 'd' },
      ],
      now,
      8,
    );
    expect(plan.map((entry) => entry.stage)).toEqual([1, 2, 3]);
    expect(plan[0]?.at).toEqual(new Date(2026, 9, 15, 19, 50));
    // Desde las 19:50, +1 d cae el 16 y se ancla a las 8:00.
    expect(plan[1]?.at).toEqual(new Date(2026, 9, 16, 8, 0));
    expect(plan[2]?.at).toEqual(new Date(2026, 9, 19, 8, 0));
  });

  it('con un horario vacío no proyecta nada', () => {
    expect(projectIntervals([], new Date(), 8)).toEqual([]);
  });
});
