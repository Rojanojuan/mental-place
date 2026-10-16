import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyGrade,
  clearAll,
  db,
  ensurePresets,
  getSetting,
  importBundle,
  setSetting,
} from '@/db';
import { getBackup, listBackups, runAutoBackup } from '@/features/import-export/autobackup';
import {
  NOTIFY_KEY,
  disablePeriodicReminder,
  enablePeriodicReminder,
  notifyDue,
  notifyPermission,
  periodicReminderState,
  requestNotifyPermission,
} from '@/features/notifications/notify';
import { PERIODIC_MIN_MS, PERIODIC_TAG } from '@/features/notifications/periodic-tag';
import { miniBundle } from './db/helpers';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copia de seguridad automática', () => {
  it('guarda una copia la primera vez', async () => {
    const backup = await runAutoBackup(new Date(2026, 9, 15, 9, 0));
    expect(backup).not.toBeNull();
    expect(backup?.bytes).toBeGreaterThan(100);

    const list = await listBackups();
    expect(list).toHaveLength(1);
    expect(list[0]?.at).toBe(new Date(2026, 9, 15, 9, 0).toISOString());
  });

  it('no repite dentro del mismo día', async () => {
    await runAutoBackup(new Date(2026, 9, 15, 9, 0));
    expect(await runAutoBackup(new Date(2026, 9, 15, 20, 0))).toBeNull();
    expect(await listBackups()).toHaveLength(1);
  });

  it('vuelve a copiar al día siguiente', async () => {
    await runAutoBackup(new Date(2026, 9, 15, 9, 0));
    await runAutoBackup(new Date(2026, 9, 16, 9, 1));
    expect(await listBackups()).toHaveLength(2);
  });

  it('guarda las cinco últimas y tira la más vieja', async () => {
    for (let day = 1; day <= 7; day += 1) {
      await runAutoBackup(new Date(2026, 9, day, 9, 0));
    }
    const list = await listBackups();
    expect(list).toHaveLength(5);
    // La más reciente va primero.
    expect(list[0]?.at).toBe(new Date(2026, 9, 7, 9, 0).toISOString());
  });

  it('la copia contiene el paquete completo y se puede recuperar', async () => {
    const at = new Date(2026, 9, 15, 9, 0);
    await runAutoBackup(at);
    const full = await getBackup(at.toISOString());
    expect(full).toBeDefined();
    const parsed = JSON.parse(full?.json ?? '{}') as { version: number; items?: unknown[] };
    expect(parsed.version).toBe(1);
    expect(parsed.items).toHaveLength(3);
  });

  it('recoge lo que se ha estudiado desde la última', async () => {
    await runAutoBackup(new Date(2026, 9, 15, 9, 0));
    await applyGrade('itm-1', 'good', new Date(2026, 9, 15, 10, 0), {}, db);
    const second = await runAutoBackup(new Date(2026, 9, 16, 9, 1));
    // El estado de repaso no va en el paquete v1, pero el ítem sí sigue entero.
    const parsed = JSON.parse(second?.json ?? '{}') as { items?: { id: string }[] };
    expect(parsed.items?.map((entry) => entry.id).sort()).toEqual(['itm-1', 'itm-2', 'itm-3']);
  });
});

describe('avisos de repasos vencidos', () => {
  function stubNotification(permission: NotificationPermission): { sent: string[] } {
    const sent: string[] = [];
    class FakeNotification {
      static permission = permission;
      static requestPermission = (): Promise<NotificationPermission> => Promise.resolve('granted');
      readonly title: string;
      readonly body: string;
      constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.body = options?.body ?? '';
        sent.push(`${this.title}|${this.body}`);
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    return { sent };
  }

  it('dice que no hay soporte si el navegador no lo trae', () => {
    vi.stubGlobal('Notification', undefined);
    expect(notifyPermission()).toBe('unsupported');
  });

  it('no avisa si el usuario no lo ha activado', async () => {
    stubNotification('granted');
    expect(await notifyDue(new Date())).toEqual({ sent: false, reason: 'disabled' });
  });

  it('no avisa si no hay nada vencido', async () => {
    const { sent } = stubNotification('granted');
    await setSetting(NOTIFY_KEY, true, db);
    expect(await notifyDue(new Date())).toEqual({ sent: false, reason: 'nothing-due' });
    expect(sent).toEqual([]);
  });

  it('avisa cuando hay vencidos, con el número', async () => {
    const { sent } = stubNotification('granted');
    await setSetting(NOTIFY_KEY, true, db);
    const now = new Date();
    await applyGrade('itm-1', 'good', new Date(now.getTime() - 3_600_000), {}, db);
    await applyGrade('itm-2', 'good', new Date(now.getTime() - 3_600_000), {}, db);

    expect(await notifyDue(now)).toEqual({ sent: true });
    expect(sent).toEqual(['Palacio Corporal|Tienes 2 repasos vencidos.']);
  });

  it('pone el singular con uno solo', async () => {
    const { sent } = stubNotification('granted');
    await setSetting(NOTIFY_KEY, true, db);
    const now = new Date();
    await applyGrade('itm-1', 'good', new Date(now.getTime() - 3_600_000), {}, db);

    await notifyDue(now);
    expect(sent[0]).toContain('1 repaso vencido');
  });

  it('no insiste antes de cuatro horas', async () => {
    const { sent } = stubNotification('granted');
    await setSetting(NOTIFY_KEY, true, db);
    const now = new Date();
    await applyGrade('itm-1', 'good', new Date(now.getTime() - 3_600_000), {}, db);

    await notifyDue(now);
    expect(await notifyDue(new Date(now.getTime() + 60 * 60_000))).toEqual({
      sent: false,
      reason: 'too-soon',
    });
    expect(sent).toHaveLength(1);
  });

  it('vuelve a avisar pasadas las cuatro horas', async () => {
    const { sent } = stubNotification('granted');
    await setSetting(NOTIFY_KEY, true, db);
    const now = new Date();
    await applyGrade('itm-1', 'good', new Date(now.getTime() - 3_600_000), {}, db);

    await notifyDue(now);
    await notifyDue(new Date(now.getTime() + 5 * 60 * 60_000));
    expect(sent).toHaveLength(2);
  });

  it('pedir permiso guarda la preferencia', async () => {
    stubNotification('default');
    expect(await requestNotifyPermission()).toBe('granted');
    expect(await getSetting(NOTIFY_KEY, false, db)).toBe(true);
  });
});

describe('aviso con la app cerrada', () => {
  interface FakeSync {
    tags: string[];
    registered: { tag: string; minInterval: number | undefined }[];
    falla: boolean;
  }

  /** Monta un `navigator.serviceWorker` de mentira con o sin `periodicSync`. */
  function stubSync(options: { soporta: boolean; tags?: string[]; falla?: boolean }): FakeSync {
    const fake: FakeSync = {
      tags: options.tags ?? [],
      registered: [],
      falla: options.falla ?? false,
    };
    const periodicSync = {
      register: (tag: string, init?: { minInterval: number }) => {
        if (fake.falla) return Promise.reject(new Error('no permitido'));
        fake.registered.push({ tag, minInterval: init?.minInterval });
        fake.tags.push(tag);
        return Promise.resolve();
      },
      getTags: () =>
        fake.falla ? Promise.reject(new Error('no permitido')) : Promise.resolve(fake.tags),
      unregister: (tag: string) => {
        fake.tags = fake.tags.filter((entry) => entry !== tag);
        return Promise.resolve();
      },
    };
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () =>
          Promise.resolve(options.soporta ? { periodicSync } : { periodicSync: undefined }),
      },
    });
    return fake;
  }

  it('sin service worker no hay nada que ofrecer', async () => {
    vi.stubGlobal('navigator', {});
    expect(await periodicReminderState()).toBe('unsupported');
  });

  it('un navegador sin la API tampoco', async () => {
    stubSync({ soporta: false });
    expect(await periodicReminderState()).toBe('unsupported');
    expect(await enablePeriodicReminder()).toBe('unsupported');
  });

  it('apagado mientras no esté registrada la etiqueta', async () => {
    stubSync({ soporta: true, tags: ['otra-cosa'] });
    expect(await periodicReminderState()).toBe('off');
  });

  it('encendido si la etiqueta ya está', async () => {
    stubSync({ soporta: true, tags: [PERIODIC_TAG] });
    expect(await periodicReminderState()).toBe('on');
  });

  it('activarlo lo registra cada doce horas', async () => {
    const fake = stubSync({ soporta: true });
    expect(await enablePeriodicReminder()).toBe('on');
    expect(fake.registered).toEqual([{ tag: PERIODIC_TAG, minInterval: PERIODIC_MIN_MS }]);
    expect(PERIODIC_MIN_MS).toBe(12 * 60 * 60 * 1000);
  });

  it('si el navegador lo rechaza, queda bloqueado y no revienta', async () => {
    stubSync({ soporta: true, falla: true });
    expect(await enablePeriodicReminder()).toBe('blocked');
    expect(await periodicReminderState()).toBe('blocked');
  });

  it('se puede desactivar', async () => {
    const fake = stubSync({ soporta: true, tags: [PERIODIC_TAG] });
    expect(await disablePeriodicReminder()).toBe('off');
    expect(fake.tags).toEqual([]);
  });
});
