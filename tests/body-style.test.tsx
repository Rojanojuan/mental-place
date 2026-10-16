import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { BODY_INNER } from '@/design/assets';
import { SKIN_FILL, bodyStyleAttrs } from '@/design/body-style';
import { PALACE_STYLE_DEFAULTS, type PalaceStyle } from '@/domain/types';
import { clearAll, db, ensurePresets, importBundle } from '@/db';
import { BodyStyler } from '@/features/body-styler/BodyStyler';
import { miniBundle, palace } from './db/helpers';
import { renderAt } from './render';

const STYLE: PalaceStyle = {
  ...PALACE_STYLE_DEFAULTS,
  accent: 'hombros',
  detail: 'med',
  line: 'bold',
  skin: 'ebano',
  vol: 'flat',
  draw: 'neon',
};

describe('la silueta incrustada', () => {
  it('llega sin la metadata C2PA, que era más de la mitad del archivo', () => {
    for (const side of ['front', 'back'] as const) {
      expect(BODY_INNER[side]).not.toContain('<metadata>');
      expect(BODY_INNER[side]).not.toContain('c2pa');
      expect(BODY_INNER[side]).not.toContain('<svg');
    }
  });

  it('cambia los id por clases: los dos cuerpos conviven en un documento', () => {
    for (const side of ['front', 'back'] as const) {
      expect(BODY_INNER[side]).not.toMatch(/\sid="(outline|face|joints|muscles|ears)"/);
      expect(BODY_INNER[side]).toContain('class="body__outline"');
    }
    expect(BODY_INNER.front).toContain('class="body__muscles"');
  });
});

describe('bodyStyleAttrs', () => {
  it('traduce la apariencia a clases', () => {
    const { className } = bodyStyleAttrs(STYLE);
    expect(className).toContain('body--detail-med');
    expect(className).toContain('body--line-bold');
    expect(className).toContain('body--vol-flat');
    expect(className).toContain('body--draw-neon');
  });

  it('pasa el color y la piel como variables CSS', () => {
    const { style } = bodyStyleAttrs(STYLE);
    expect(style['--body-accent']).toBe('var(--zone-hombros)');
    expect(style['--body-skin']).toBe(SKIN_FILL.ebano);
  });

  it('sin apariencia usa los valores por defecto del contrato', () => {
    const { className, style } = bodyStyleAttrs();
    expect(className).toContain('body--detail-full');
    expect(className).toContain('body--line-fine');
    expect(style['--body-accent']).toBe('var(--zone-cabeza)');
  });

  it('«plano» deja el cuerpo sin relleno', () => {
    expect(SKIN_FILL.plano).toBe('transparent');
  });
});

describe('Mis cuerpos', () => {
  beforeEach(async () => {
    await clearAll(db);
    await importBundle({ ...miniBundle(), palaces: [palace('pal-1', { style: STYLE })] }, db);
    await ensurePresets(db);
  });

  it('marca la apariencia que ya tiene el palacio', async () => {
    renderAt(<BodyStyler />, '/cuerpos');
    await screen.findByRole('heading', { name: 'Mis cuerpos' });

    expect(screen.getByRole('button', { name: /Rasgos y articulaciones/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Grueso/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Neón/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la aplica a la silueta', async () => {
    renderAt(<BodyStyler />, '/cuerpos');
    await screen.findByRole('heading', { name: 'Mis cuerpos' });

    const body = document.querySelector('.body');
    expect(body?.getAttribute('class')).toContain('body--draw-neon');
    expect(body?.getAttribute('style')).toContain('--body-accent: var(--zone-hombros)');
  });

  it('cambiar una opción se ve al momento, sin guardar', async () => {
    renderAt(<BodyStyler />, '/cuerpos');
    await screen.findByRole('heading', { name: 'Mis cuerpos' });

    await userEvent.click(screen.getByRole('button', { name: /Solo contorno/ }));
    expect(document.querySelector('.body')?.getAttribute('class')).toContain('body--detail-min');
    // Todavía no se ha tocado la base.
    expect((await db.palaces.get('pal-1'))?.style?.detail).toBe('med');
  });

  it('guarda al pulsar Guardar', async () => {
    renderAt(<BodyStyler />, '/cuerpos');
    await screen.findByRole('heading', { name: 'Mis cuerpos' });

    await userEvent.click(screen.getByRole('button', { name: /Atlas/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.palaces.get('pal-1'))?.style?.draw).toBe('atlas');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });

  it('dice qué no puede aplicar en vez de fingirlo', async () => {
    renderAt(<BodyStyler />, '/cuerpos');
    await screen.findByRole('heading', { name: 'Mis cuerpos' });

    expect(screen.getByText(/Falta en la silueta/)).toBeInTheDocument();
    expect(screen.getByText(/hair, hairColor, facial, glasses/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lápiz/ })).toHaveTextContent('pendiente');
  });
});
