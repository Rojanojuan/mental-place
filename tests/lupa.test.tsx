import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BODY_VIEWBOX } from '@/design/assets';
import type { Bundle, ID, Locus, LocusState } from '@/domain/types';
import { Lupa } from '@/components/Lupa';
import { diametroSinSolape, recorteDenso } from '@/components/lupa-crop';

const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8'),
) as Bundle;
const LOCI = seed.loci ?? [];

function punto(n: number, x: number, y: number, dense = true): Locus {
  return {
    id: `l${String(n)}`,
    palaceId: 'p',
    routeNo: n,
    partName: `P${String(n)}`,
    side: 'front',
    pos: { x, y },
    dense,
  };
}

describe('el recorte de la lupa', () => {
  it('encierra los puntos densos del palacio de fonética', () => {
    const r = recorteDenso(LOCI, 'front');
    expect(r).not.toBeNull();
    const densos = LOCI.filter((l) => l.dense === true && l.side === 'front');
    expect(densos.length).toBeGreaterThan(8);
    for (const l of densos) {
      const x = l.pos.x * BODY_VIEWBOX.width;
      const y = l.pos.y * BODY_VIEWBOX.height;
      expect(x).toBeGreaterThanOrEqual(r!.x);
      expect(x).toBeLessThanOrEqual(r!.x + r!.w);
      expect(y).toBeGreaterThanOrEqual(r!.y);
      expect(y).toBeLessThanOrEqual(r!.y + r!.h);
    }
  });

  it('es cuadrado: el círculo no debe deformar el cuerpo', () => {
    const r = recorteDenso(LOCI, 'front')!;
    expect(r.w).toBeCloseTo(r.h, 5);
  });

  it('amplía de verdad: ocupa una fracción del lienzo', () => {
    const r = recorteDenso(LOCI, 'front')!;
    expect(r.w).toBeLessThan(BODY_VIEWBOX.width);
  });

  it('sin puntos densos no hay lupa', () => {
    expect(
      recorteDenso([punto(1, 0.5, 0.1, false), punto(2, 0.5, 0.2, false)], 'front'),
    ).toBeNull();
  });

  it('con un solo punto denso tampoco: no hay nada que separar', () => {
    expect(recorteDenso([punto(1, 0.5, 0.1)], 'front')).toBeNull();
  });

  it('solo mira el lado que se pide', () => {
    const atras = LOCI.filter((l) => l.side === 'back');
    expect(atras.some((l) => l.dense === true)).toBe(false);
    expect(recorteDenso(LOCI, 'back')).toBeNull();
  });
});

describe('el diámetro que no amontona', () => {
  it('no supera el hueco al vecino más cercano', () => {
    const r = recorteDenso(LOCI, 'front')!;
    const visibles = LOCI.filter((l) => l.side === 'front');
    const d = diametroSinSolape(visibles, r);

    // Distancias al vecino más cercano, dentro del recorte.
    const dentro = visibles
      .map((l) => ({ x: l.pos.x * BODY_VIEWBOX.width, y: l.pos.y * BODY_VIEWBOX.height }))
      .filter((p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    const vecinos = dentro
      .map((a) =>
        Math.min(...dentro.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
      )
      .sort((x, y) => x - y);
    const mediana = vecinos[Math.floor(vecinos.length / 2)]!;

    expect(d).toBeLessThanOrEqual(mediana * 0.8 + 0.001);
    // Y no se queda en nada: se tiene que poder tocar y leer.
    expect(d).toBeGreaterThanOrEqual(r.w * 0.045 - 0.001);
  });

  it('con un solo punto usa el máximo', () => {
    const r = { x: 0, y: 0, w: 100, h: 100 };
    expect(diametroSinSolape([punto(1, 0.1, 0.1)], r)).toBeCloseTo(11, 5);
  });
});

describe('la lupa en pantalla', () => {
  const estados: Record<ID, LocusState> = Object.fromEntries(LOCI.map((l) => [l.id, 'new']));

  it('enseña los puntos amontonados con su número', () => {
    const { container } = render(<Lupa loci={LOCI} statusByLocus={estados} />);
    // En jsdom no hay `matchMedia` de ancho real: la lupa nace cerrada, pero
    // el contenido está en el DOM igual (es `<details>`, no un condicional).
    const numeros = [...container.querySelectorAll('.lupa__map text')].map((t) => t.textContent);
    // Los 15 densos de la cabeza, cada uno con su número de ruta.
    expect(numeros).toContain('1');
    expect(numeros).toContain('15');
    expect(numeros.length).toBeGreaterThan(10);
  });

  it('avisa del punto que se toca', async () => {
    const onLocusTap = vi.fn();
    render(<Lupa loci={LOCI} statusByLocus={estados} onLocusTap={onLocusTap} />);
    const pin = screen.getAllByRole('button', { name: /^Lupa:/ })[0]!;
    await userEvent.click(pin);
    expect(onLocusTap).toHaveBeenCalledTimes(1);
  });

  it('dice cuántos puntos agrupa, para saber si merece abrirla', () => {
    render(<Lupa loci={LOCI} statusByLocus={estados} />);
    expect(screen.getByText(/15 puntos juntos/)).toBeInTheDocument();
  });

  it('no se pinta si no hay puntos amontonados', () => {
    const { container } = render(<Lupa loci={[punto(1, 0.5, 0.1, false)]} statusByLocus={{}} />);
    expect(container.querySelector('.lupa')).toBeNull();
  });
});
