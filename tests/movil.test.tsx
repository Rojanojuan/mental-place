import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bundle } from '@/domain/types';
import { revealPanel } from '@/components/reveal';
import { clearAll, db, ensurePresets, importBundle } from '@/db';
import { Inspector } from '@/features/inspector/Inspector';
import { renderAt } from './render';

const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8'),
) as Bundle;

const ANCHO_ORIGINAL = window.innerWidth;

/** jsdom no cambia de tamaño: el ancho se fija a mano para cada caso. */
function viewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
}

afterEach(() => {
  viewport(ANCHO_ORIGINAL);
  vi.restoreAllMocks();
});

describe('traer el panel a la vista', () => {
  it('en una columna desplaza el panel', () => {
    viewport(390);
    const el = document.createElement('div');
    const spy = vi.spyOn(el, 'scrollIntoView');
    revealPanel(el);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ block: 'start' });
  });

  it('en escritorio no toca nada: el panel ya está al lado', () => {
    viewport(1280);
    const el = document.createElement('div');
    const spy = vi.spyOn(el, 'scrollIntoView');
    revealPanel(el);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sin elemento no revienta', () => {
    viewport(390);
    expect(() => {
      revealPanel(null);
    }).not.toThrow();
  });
});

describe('el Inspector en el teléfono', () => {
  beforeEach(async () => {
    await clearAll(db);
    await importBundle(seed, db);
    await ensurePresets(db);
  });

  it('elegir un punto lleva el detalle a la vista', async () => {
    viewport(390);
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);
    spy.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /^3\s*Cejas/ }));

    expect(spy).toHaveBeenCalled();
    // Y es el detalle, no otra cosa.
    const destino = spy.mock.instances[0] as Element;
    expect(destino.getAttribute('class')).toContain('insp__detail');
  });

  it('en escritorio elegir un punto no desplaza la pantalla', async () => {
    viewport(1280);
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);
    spy.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /^3\s*Cejas/ }));

    expect(spy).not.toHaveBeenCalled();
  });
});
