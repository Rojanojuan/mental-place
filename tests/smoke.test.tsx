import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import { renderAt } from './render';

describe('cáscara de la app', () => {
  it('monta con su cabecera y su navegación', () => {
    renderAt(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Palacio Corporal' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Secciones' });
    expect(nav).toBeInTheDocument();
    for (const label of ['Hoy', 'Palacio', 'Tokens']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('cubre los siete estados del contrato con token y etiqueta', () => {
    expect(Object.keys(STATE_TOKEN)).toHaveLength(7);
    expect(Object.keys(STATE_LABEL)).toEqual(Object.keys(STATE_TOKEN));
  });

  it('la ruta de tokens muestra los estados y las siluetas', () => {
    renderAt(<App />, '/tokens');
    expect(screen.getByRole('heading', { name: 'Estados semánticos' })).toBeInTheDocument();
    expect(screen.getByAltText('Silueta frontal')).toBeInTheDocument();
    expect(screen.getByAltText('Silueta posterior')).toBeInTheDocument();
  });
});
