import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Bundle } from '@/domain/types';
import { applyGrade, clearAll, db, ensurePresets, importBundle } from '@/db';
import { Inspector } from '@/features/inspector/Inspector';
import { renderAt } from './render';

const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8'),
) as Bundle;

beforeEach(async () => {
  await clearAll(db);
  await importBundle(seed, db);
  await ensurePresets(db);
});

const heading = (): Promise<HTMLElement> =>
  screen.findByRole('heading', { name: 'Fonética · Estándar 45' });

describe('Inspector', () => {
  it('pinta el palacio con sus 45 puntos y 5 zonas', async () => {
    renderAt(<Inspector />, '/inspector');
    expect(await heading()).toBeInTheDocument();
    expect(screen.getByText(/45 puntos · 44 con contenido · 5 zonas/)).toBeInTheDocument();
    // Un pin por punto (los botones de la lista de ruta tienen otro nombre).
    expect(screen.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(45);
  });

  it('abre el primer punto con contenido y muestra sus tablas', async () => {
    renderAt(<Inspector />, '/inspector');
    await heading();

    // El ancla sale con el mapa; los bloques llegan en una segunda consulta.
    await waitFor(() => {
      expect(screen.getByText(/Patrones del sonido/)).toBeInTheDocument();
    });
    expect(screen.getByText('/j/ · YES')).toBeInTheDocument();
    expect(screen.getByText('Silla')).toBeInTheDocument();
    expect(screen.getByText(/4 patrones de escritura/)).toBeInTheDocument();
  });

  it('cambia de punto al tocar otro pin', async () => {
    renderAt(<Inspector />, '/inspector');
    await heading();

    await userEvent.click(screen.getByRole('button', { name: /^2\. Frente/ }));

    await waitFor(() => {
      expect(screen.getByText('/iː/ · CHEESE')).toBeInTheDocument();
    });
    expect(screen.getByText('CHEESE /ʧiːz/ — QUESO')).toBeInTheDocument();
    expect(screen.getByText('Globo')).toBeInTheDocument();
    expect(screen.getByText(/Minimal pairs/)).toBeInTheDocument();
    expect(screen.getByText('Yeast')).toBeInTheDocument();
  });

  it('avisa de que el punto 34 no tiene contenido', async () => {
    renderAt(<Inspector />, '/inspector');
    await heading();

    await userEvent.click(screen.getByRole('button', { name: /^34\. Tobillo/ }));

    await waitFor(() => {
      expect(screen.getByText(/Punto sin contenido/)).toBeInTheDocument();
    });
    expect(screen.getByText(/falta la sección correspondiente/)).toBeInTheDocument();
  });

  it('refleja el estado de repaso que hay en la base de datos', async () => {
    // El punto 1 pasa de «Nuevo» a «Aprendiendo» al calificarlo.
    renderAt(<Inspector />, '/inspector');
    await heading();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^1\. Pelo.*Nuevo/ })).toBeInTheDocument();
    });

    await applyGrade('itm-fonetica45-01', 'good', new Date(), {}, db);

    // `useLiveQuery` rehace la consulta del mapa entera (45 puntos y sus
    // estados); con la instrumentación de cobertura tarda más de 1 s.
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /^1\. Pelo.*Aprendiendo/ })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('espera mientras la base de datos está vacía', async () => {
    await clearAll(db);
    renderAt(<Inspector />, '/inspector');
    expect(await screen.findByText(/Abriendo la base de datos/)).toBeInTheDocument();
    expect(screen.getByText(/npm run seed:fonetica/)).toBeInTheDocument();
  });
});
