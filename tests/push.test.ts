import { describe, expect, it } from 'vitest';
// El Worker es JavaScript plano: se importa igual que cualquier módulo.
import { limpiarFechas, tocaAvisar } from '../worker/src/index.js';
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
