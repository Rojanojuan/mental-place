import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import type { Bundle } from '@/domain/types';
import { clearAll, db, ensurePresets, importBundle } from '@/db';
import { Inspector } from '@/features/inspector/Inspector';
import { LocusEditor } from '@/features/locus/LocusEditor';
import { PalaceEditor } from '@/features/palace-editor/PalaceEditor';
import { Session } from '@/features/session/Session';
import { renderAt } from './render';

const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), 'seed/fonetica45.json'), 'utf8'),
) as Bundle;

beforeEach(async () => {
  await clearAll(db);
  await importBundle(seed, db);
  await ensurePresets(db);
});

describe('la parte del cuerpo en el idioma que se estudia', () => {
  it('viene en el punto, no solo en el ítem', () => {
    const loci = seed.loci ?? [];
    const conTraduccion = loci.filter((locus) => locus.partNameEn !== undefined);
    // Las 44 con sección en el Word; el 34 no la tiene.
    expect(conTraduccion).toHaveLength(44);

    const pelo = loci.find((locus) => locus.routeNo === 1);
    expect(pelo?.partName).toBe('Pelo / Cabello');
    expect(pelo?.partNameEn).toBe('Hair');
    expect(pelo?.partIpa).toBe('heər');
  });

  it('sale al lado del nombre en el título del punto', async () => {
    renderAt(<Inspector />, '/inspector');
    const heading = await screen.findByRole('heading', { level: 3, name: /Pelo \/ Cabello/ });
    expect(heading).toHaveTextContent('Hair');
    expect(heading).toHaveTextContent('/heər/');
  });

  it('y en cada fila de la lista de ruta', async () => {
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);

    const fila = screen.getByRole('button', { name: /Frente.*Forehead/ });
    expect(fila).toHaveTextContent('Forehead');
    expect(fila).toHaveTextContent('/ˈfɔːhed/');
  });

  it('y en la sesión, bajo el punto señalado', async () => {
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 20');
    expect(screen.getByText(/Hair/)).toBeInTheDocument();
    expect(screen.getByText('/heər/')).toBeInTheDocument();
  });

  it('se puede editar desde el detalle del punto', async () => {
    renderAt(
      <Routes>
        <Route path="/punto/:locusId" element={<LocusEditor />} />
      </Routes>,
      '/punto/loc-fonetica45-01',
    );
    const campo = await screen.findByLabelText(/Nombre en el idioma que estudias/);
    expect(campo).toHaveValue('Hair');

    await userEvent.clear(campo);
    await userEvent.type(campo, 'Scalp');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.loci.get('loc-fonetica45-01'))?.partNameEn).toBe('Scalp');
    });
  });

  it('un punto sin traducción no enseña nada vacío', async () => {
    const tobillo = (await db.loci.get('loc-fonetica45-34'))!;
    expect(tobillo.partNameEn).toBeUndefined();

    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);
    const fila = screen.getAllByRole('button', { name: /Tobillo/ }).at(-1)!;
    expect(fila).toHaveTextContent('Tobillo');
    expect(fila.textContent).not.toContain('//');
  });
});

describe('las unidades de repaso del contrato §4.4', () => {
  it('la cola de hoy limita los nuevos', async () => {
    renderAt(<Session />, '/sesion');
    expect(await screen.findByText('1 / 20')).toBeInTheDocument();
  });

  it('un punto concreto trae solo sus ítems', async () => {
    renderAt(<Session />, '/sesion?scope=locus&punto=loc-fonetica45-02');
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getAllByText(/Frente/).length).toBeGreaterThan(0);
  });

  it('una zona trae sus puntos y no los demás', async () => {
    renderAt(<Session />, '/sesion?scope=zone&zona=zon-fonetica45-cabeza');
    // La zona «Cabeza» son los puntos 1–15; el 34 no tiene ítem.
    expect(await screen.findByText('1 / 15')).toBeInTheDocument();
  });

  it('el palacio entero no se queda en el límite diario', async () => {
    renderAt(<Session />, '/sesion?scope=palace');
    expect(await screen.findByText('1 / 44')).toBeInTheDocument();
  });

  it('el recorrido va en orden de ruta', async () => {
    renderAt(<Session />, '/sesion?scope=walk');
    expect(await screen.findByText('1 / 44')).toBeInTheDocument();
    expect(screen.getAllByText(/Pelo \/ Cabello/).length).toBeGreaterThan(0);
  });

  it('el Inspector ofrece las cuatro unidades', async () => {
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);

    expect(await screen.findByRole('link', { name: 'Repasar este punto' })).toHaveAttribute(
      'href',
      '/sesion?scope=locus&punto=loc-fonetica45-01',
    );
    expect(screen.getByRole('link', { name: 'Repasar la zona' })).toHaveAttribute(
      'href',
      '/sesion?scope=zone&zona=zon-fonetica45-cabeza',
    );
    expect(screen.getByRole('link', { name: 'Todo el palacio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recorrido' })).toBeInTheDocument();
  });

  it('cada zona de la cabecera lanza su repaso', async () => {
    renderAt(<Inspector />, '/inspector');
    await screen.findByText(/45 puntos/);
    const zona = screen.getByRole('link', { name: /Cabeza · Vocales/ });
    expect(zona).toHaveAttribute('href', '/sesion?scope=zone&zona=zon-fonetica45-cabeza');
  });
});

describe('más edición del cuerpo', () => {
  it('renombra un punto desde la lista del editor', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText(/45 puntos/);

    const campo = screen.getByLabelText('Nombre de Pelo / Cabello');
    await userEvent.clear(campo);
    // Se guarda al pulsar Enter o al salir, no en cada tecla: escribir en
    // IndexedDB por letra hacía que el valor volviera a medio teclear.
    await userEvent.type(campo, 'Cuero cabelludo{Enter}');

    await waitFor(async () => {
      expect((await db.loci.get('loc-fonetica45-01'))?.partName).toBe('Cuero cabelludo');
    });
  });

  it('también guarda al salir del campo', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText(/45 puntos/);

    const campo = screen.getByLabelText('Nombre de Frente');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Frente alta');
    await userEvent.tab();

    await waitFor(async () => {
      expect((await db.loci.get('loc-fonetica45-02'))?.partName).toBe('Frente alta');
    });
  });

  it('vaciar el campo no borra el nombre', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText(/45 puntos/);

    const campo = screen.getByLabelText('Nombre de Cejas');
    await userEvent.clear(campo);
    await userEvent.tab();

    expect((await db.loci.get('loc-fonetica45-03'))?.partName).toBe('Cejas');
  });

  it('en modo Ruta el nombre deja de ser editable', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText(/45 puntos/);
    await userEvent.click(screen.getByRole('tab', { name: 'Ruta' }));
    expect(screen.queryByLabelText('Nombre de Pelo / Cabello')).not.toBeInTheDocument();
  });

  it('abre el punto elegido en su detalle', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText(/45 puntos/);

    await userEvent.click(screen.getByRole('button', { name: /^3\. Cejas/ }));
    expect(await screen.findByRole('link', { name: 'Abrir el punto elegido' })).toHaveAttribute(
      'href',
      '/punto/loc-fonetica45-03',
    );
  });
});
