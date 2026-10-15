import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Inspector } from '@/features/inspector/Inspector';

const seed = readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8');

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(seed, { status: 200 }))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Inspector', () => {
  it('pinta el palacio con sus 45 puntos y 5 zonas', async () => {
    render(<Inspector />);
    expect(
      await screen.findByRole('heading', { name: 'Fonética · Estándar 45' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/45 puntos · 44 con contenido · 5 zonas/)).toBeInTheDocument();
    // Un pin por punto, más un botón por punto en la lista de ruta.
    expect(screen.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(45);
  });

  it('abre el primer punto con contenido y muestra sus tablas', async () => {
    render(<Inspector />);
    await screen.findByRole('heading', { name: 'Fonética · Estándar 45' });

    expect(screen.getByText('/j/ · YES')).toBeInTheDocument();
    expect(screen.getByText(/Patrones del sonido/)).toBeInTheDocument();
    expect(screen.getByText('Silla')).toBeInTheDocument();
    expect(screen.getByText(/4 patrones de escritura/)).toBeInTheDocument();
  });

  it('cambia de punto al tocar otro pin', async () => {
    render(<Inspector />);
    await screen.findByRole('heading', { name: 'Fonética · Estándar 45' });

    await userEvent.click(screen.getByRole('button', { name: /^2\. Frente/ }));

    await waitFor(() => {
      expect(screen.getByText('/iː/ · CHEESE')).toBeInTheDocument();
    });
    expect(screen.getByText('CHEESE /ʧiːz/ — QUESO')).toBeInTheDocument();
    expect(screen.getByText('Globo')).toBeInTheDocument();
    expect(screen.getByText(/Minimal pairs/)).toBeInTheDocument();
    // La tabla de patrones de /iː/ trae 9 grupos y 40 palabras.
    expect(screen.getByText('Yeast')).toBeInTheDocument();
  });

  it('avisa de que el punto 34 no tiene contenido', async () => {
    render(<Inspector />);
    await screen.findByRole('heading', { name: 'Fonética · Estándar 45' });

    await userEvent.click(screen.getByRole('button', { name: /^34\. Tobillo/ }));

    await waitFor(() => {
      expect(screen.getByText(/Punto sin contenido/)).toBeInTheDocument();
    });
    expect(screen.getByText(/falta la sección correspondiente/)).toBeInTheDocument();
  });

  it('informa si la semilla no se puede leer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
    );
    render(<Inspector />);
    expect(await screen.findByText(/No se pudo cargar la semilla/)).toBeInTheDocument();
    expect(screen.getByText(/npm run seed:fonetica/)).toBeInTheDocument();
  });
});
