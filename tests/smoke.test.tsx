import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';

describe('andamiaje de la Fase 0', () => {
  it('renderiza la pantalla de verificación', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Palacio Corporal' })).toBeInTheDocument();
  });

  it('cubre los siete estados del contrato con token y etiqueta', () => {
    expect(Object.keys(STATE_TOKEN)).toHaveLength(7);
    expect(Object.keys(STATE_LABEL)).toEqual(Object.keys(STATE_TOKEN));
  });
});
