import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyGrade,
  clearAll,
  db,
  ensurePresets,
  importBundle,
  nextDueAfter,
  proximosRepasos,
  setSuspended,
} from '@/db';
import { NOTIFY_KEY } from '@/features/notifications/notify';
import { avisarAhora, scheduleNextDue } from '@/features/notifications/timer';
import { setSetting } from '@/db';
import { miniBundle } from './db/helpers';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('el próximo repaso', () => {
  it('sin nada estudiado, no hay nada que programar', async () => {
    expect(await nextDueAfter(new Date())).toBeNull();
  });

  it('tras calificar, apunta al siguiente checkpoint y nombra su punto', async () => {
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', ahora, {}, db);

    const proximo = await nextDueAfter(ahora);
    expect(proximo).not.toBeNull();
    // R10 · etapa 1 → 10 minutos.
    expect(proximo?.at.getTime()).toBe(ahora.getTime() + 10 * 60_000);
    expect(proximo?.cuantos).toBe(1);
    expect(proximo?.punto).toBeTypeOf('string');
  });

  it('cuenta cuántos caen en el mismo instante', async () => {
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', ahora, {}, db);
    await applyGrade('itm-2', 'good', ahora, {}, db);

    const proximo = await nextDueAfter(ahora);
    expect(proximo?.cuantos).toBe(2);
  });

  it('lo pausado no cuenta', async () => {
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', ahora, {}, db);
    await setSuspended('itm-1', true, db);
    expect(await nextDueAfter(ahora)).toBeNull();
  });

  it('lo ya vencido tampoco: de eso avisa el arranque', async () => {
    const antes = new Date(2026, 9, 17, 9, 0, 0);
    await applyGrade('itm-1', 'good', antes, {}, db);
    // Media hora después, aquel checkpoint de 10 min ya pasó.
    expect(await nextDueAfter(new Date(2026, 9, 17, 9, 30, 0))).toBeNull();
  });
});

describe('los repasos del calendario', () => {
  it('se agrupan por el instante en que caen', async () => {
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', ahora, {}, db);
    await applyGrade('itm-2', 'good', ahora, {}, db);

    const lista = await proximosRepasos(ahora, 60, db);
    expect(lista).toHaveLength(1);
    expect(lista[0]?.cuantos).toBe(2);
  });

  it('respeta la ventana de días que se pida', async () => {
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', ahora, {}, db);
    // El checkpoint cae a los 10 minutos: entra en cualquier ventana.
    expect(await proximosRepasos(ahora, 1, db)).toHaveLength(1);
    // Una ventana que acaba antes no lo coge.
    const lejos = new Date(ahora.getTime() + 60 * 60_000);
    expect(await proximosRepasos(lejos, 60, db)).toHaveLength(0);
  });
});

describe('el aviso en su minuto', () => {
  function stubNotification(): { sent: string[] } {
    const sent: string[] = [];
    function FakeNotification(this: unknown, title: string, options?: NotificationOptions) {
      sent.push(`${title}|${options?.body ?? ''}`);
    }
    FakeNotification.permission = 'granted' as NotificationPermission;
    FakeNotification.requestPermission = (): Promise<NotificationPermission> =>
      Promise.resolve('granted');
    vi.stubGlobal('Notification', FakeNotification);
    return { sent };
  }

  it('no avisa si el usuario no lo ha activado', async () => {
    stubNotification();
    const ahora = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', new Date(ahora.getTime() - 10 * 60_000), {}, db);
    expect(await avisarAhora(ahora)).toBe(false);
  });

  it('avisa nombrando el punto cuando llega la hora', async () => {
    const { sent } = stubNotification();
    await setSetting(NOTIFY_KEY, true, db);
    const base = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', base, {}, db);

    // Justo en el minuto del checkpoint.
    const cuando = new Date(base.getTime() + 10 * 60_000);
    expect(await avisarAhora(cuando)).toBe(true);
    expect(sent[0]).toMatch(/Toca repasar/);
  });

  it('con varios, lo dice', async () => {
    const { sent } = stubNotification();
    await setSetting(NOTIFY_KEY, true, db);
    const base = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', base, {}, db);
    await applyGrade('itm-2', 'good', base, {}, db);

    await avisarAhora(new Date(base.getTime() + 10 * 60_000));
    expect(sent[0]).toMatch(/y 1 más/);
  });

  it('antes de tiempo no se inventa un aviso', async () => {
    stubNotification();
    await setSetting(NOTIFY_KEY, true, db);
    const base = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', base, {}, db);
    // Cinco minutos: todavía no toca.
    expect(await avisarAhora(new Date(base.getTime() + 5 * 60_000))).toBe(false);
  });
});

describe('el temporizador', () => {
  /**
   * Se comprueba la **decisión**: a qué momento apunta y con cuánto retraso
   * arma el `setTimeout`. Adelantar un reloj falso no vale aquí, porque cada
   * paso del temporizador pasa por una consulta a IndexedDB, que corre fuera
   * de ese reloj.
   */
  it('apunta al próximo checkpoint y espera justo lo que falta', async () => {
    const base = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', base, {}, db);

    const retrasos: number[] = [];
    const real = globalThis.setTimeout;
    vi.stubGlobal('setTimeout', (_fn: () => void, ms?: number) => {
      retrasos.push(ms ?? 0);
      // No se encadena: interesa el primer retraso, no dejarlo corriendo.
      return real(() => undefined, 0);
    });

    const prog = scheduleNextDue(
      () => undefined,
      () => base,
    );
    await vi.waitFor(() => {
      expect(prog.at).not.toBeNull();
    });

    expect(prog.at?.getTime()).toBe(base.getTime() + 10 * 60_000);
    // Diez minutos exactos, no «cuando el navegador quiera».
    expect(retrasos[0]).toBe(10 * 60_000);
    prog.cancel();
  });

  it('sin nada pendiente no apunta a ninguna hora', async () => {
    const prog = scheduleNextDue(
      () => undefined,
      () => new Date(2026, 9, 17, 10, 0, 0),
    );
    await vi.waitFor(() => {
      expect(prog.at).toBeNull();
    });
    prog.cancel();
  });

  it('cancelado, no vuelve a armar nada', async () => {
    const base = new Date(2026, 9, 17, 10, 0, 0);
    await applyGrade('itm-1', 'good', base, {}, db);

    const prog = scheduleNextDue(
      () => undefined,
      () => base,
    );
    await vi.waitFor(() => {
      expect(prog.at).not.toBeNull();
    });

    let despues = 0;
    const real = globalThis.setTimeout;
    vi.stubGlobal('setTimeout', (fn: () => void, ms?: number) => {
      despues += 1;
      return real(fn, ms);
    });

    prog.cancel();
    await new Promise((r) => real(r, 50));
    expect(despues).toBe(0);
  });
});
