import { describe, expect, it } from 'vitest';
// El Worker es JavaScript plano: se importa igual que cualquier módulo.
import { leerIndice, limpiarFechas, repartir, tocaAvisar } from '../worker/src/index.js';
import { claveABytes } from '@/features/notifications/push';

const AHORA = Date.UTC(2026, 9, 17, 12, 0, 0);
const MIN = 60_000;
const HORA = 60 * MIN;

describe('qué fechas guarda el servidor', () => {
  it('tira lo caducado y ordena el resto', () => {
    const fechas = [AHORA + 2 * HORA, AHORA - 10 * HORA, AHORA + HORA];
    expect(limpiarFechas(fechas, AHORA)).toEqual([AHORA + HORA, AHORA + 2 * HORA]);
  });

  it('conserva lo recién vencido: un aviso con una hora de retraso sigue valiendo', () => {
    expect(limpiarFechas([AHORA - HORA], AHORA)).toEqual([AHORA - HORA]);
  });

  it('no repite la misma fecha', () => {
    expect(limpiarFechas([AHORA + HORA, AHORA + HORA], AHORA)).toHaveLength(1);
  });

  it('descarta lo que no sea un número', () => {
    const sucio = [AHORA + HORA, 'mañana', null, Number.NaN, Infinity] as unknown as number[];
    expect(limpiarFechas(sucio, AHORA)).toEqual([AHORA + HORA]);
  });

  it('pone un tope: nadie necesita mil avisos por delante', () => {
    const muchas = Array.from({ length: 500 }, (_, i) => AHORA + (i + 1) * HORA);
    expect(limpiarFechas(muchas, AHORA)).toHaveLength(60);
  });
});

describe('cuándo toca avisar', () => {
  it('cuando una fecha ya llegó', () => {
    expect(tocaAvisar([AHORA - MIN], AHORA)).toBe(true);
  });

  it('no antes de tiempo', () => {
    expect(tocaAvisar([AHORA + MIN], AHORA)).toBe(false);
  });

  it('no por algo de hace días: eso ya no es un aviso, es ruido', () => {
    expect(tocaAvisar([AHORA - 48 * HORA], AHORA)).toBe(false);
  });

  it('sin fechas, nada', () => {
    expect(tocaAvisar([], AHORA)).toBe(false);
  });
});

describe('la clave pública para suscribirse', () => {
  it('pasa de base64 url-safe a los 65 bytes que espera el navegador', () => {
    // Una clave VAPID real: 0x04 + X(32) + Y(32).
    const clave =
      'BKYfrd_sUaC9pPO6J4wr1YL7BkglPPag1eNYF6uLjhh8KGMZkDrKJLHzOgnMG2Fr3-FiCrH6sCtqz-uJEqAd_nM';
    const bytes = claveABytes(clave);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });

  it('acepta las que vienen sin relleno', () => {
    expect(claveABytes('AQAB')).toHaveLength(3);
    expect(() => claveABytes('AQA')).not.toThrow();
  });
});

describe('el reparto del cron', () => {
  /** Un KV de mentira que además cuenta las operaciones que se gastan. */
  function kvFalso(inicial: Record<string, string> = {}) {
    const datos = new Map(Object.entries(inicial));
    const ops = { get: 0, put: 0, delete: 0 };
    return {
      ops,
      datos,
      env: {
        AVISOS: {
          get: (k: string) => {
            ops.get += 1;
            return Promise.resolve(datos.get(k) ?? null);
          },
          put: (k: string, v: string) => {
            ops.put += 1;
            datos.set(k, v);
            return Promise.resolve();
          },
          delete: (k: string) => {
            ops.delete += 1;
            datos.delete(k);
            return Promise.resolve();
          },
        },
      },
    };
  }

  it('sin dispositivos no gasta más que una lectura', async () => {
    const kv = kvFalso();
    expect(await repartir(kv.env)).toBe(0);
    // Una sola: la del índice. Nada de `list`, que es lo que está limitado.
    expect(kv.ops.get).toBe(1);
    expect(kv.ops.put).toBe(0);
  });

  it('olvida al dispositivo cuyo registro ya no está', async () => {
    const kv = kvFalso({ indice: JSON.stringify(['sub:fantasma']) });
    await repartir(kv.env);
    expect(await leerIndice(kv.env)).toEqual([]);
  });

  it('olvida al que lleva meses sin dar señales', async () => {
    const viejo = Date.now() - 200 * 24 * 60 * 60 * 1000;
    const kv = kvFalso({
      indice: JSON.stringify(['sub:a']),
      'sub:a': JSON.stringify({
        subscription: { endpoint: 'https://push/x' },
        dueAts: [],
        visto: viejo,
      }),
    });
    await repartir(kv.env);
    expect(kv.datos.has('sub:a')).toBe(false);
    expect(await leerIndice(kv.env)).toEqual([]);
  });

  it('a quien no le toca, no lo toca: ni una escritura', async () => {
    const kv = kvFalso({
      indice: JSON.stringify(['sub:a']),
      'sub:a': JSON.stringify({
        subscription: { endpoint: 'https://push/x' },
        dueAts: [Date.now() + 60 * 60_000],
        visto: Date.now(),
      }),
    });
    expect(await repartir(kv.env)).toBe(0);
    expect(kv.ops.put).toBe(0);
  });

  it('un índice corrupto no tumba el cron', async () => {
    const kv = kvFalso({ indice: 'esto no es json' });
    expect(await leerIndice(kv.env)).toEqual([]);
    expect(await repartir(kv.env)).toBe(0);
  });
});
