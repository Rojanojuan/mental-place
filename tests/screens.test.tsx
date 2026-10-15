import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyGrade, clearAll, db, ensurePresets, importBundle, setSuspended } from '@/db';
import { Library } from '@/features/library/Library';
import { Schedules } from '@/features/schedules/Schedules';
import { Stats } from '@/features/stats/Stats';
import { R10 } from '@/srs';
import { item, miniBundle } from './db/helpers';
import { renderAt } from './render';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

describe('Horarios', () => {
  it('lista los cinco presets del contrato', async () => {
    renderAt(<Schedules />, '/horarios');
    expect(await screen.findByRole('button', { name: /R10/ })).toBeInTheDocument();
    for (const name of ['Rápido examen', 'Clásico 1-3-7-14-30', 'Adaptativo', 'Personalizado']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('abre R10 con sus diez etapas y la hora preferida', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('heading', { name: 'R10', level: 3 });

    expect(screen.getAllByLabelText(/Valor de la etapa/)).toHaveLength(10);
    expect(screen.getByLabelText('Valor de la etapa 1')).toHaveValue(10);
    expect(screen.getByLabelText('Unidad de la etapa 1')).toHaveValue('min');
    expect(screen.getByLabelText('Hora preferida')).toHaveValue(23 - 15);
  });

  it('muestra en qué fecha caería cada etapa', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('heading', { name: 'R10', level: 3 });
    // La etapa 1 son 10 minutos: cae hoy.
    expect(screen.getAllByText(/^Hoy, /).length).toBeGreaterThan(0);
    expect(screen.getByText(/el último repaso caería el/)).toBeInTheDocument();
  });

  it('editar un intervalo guarda el horario', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('heading', { name: 'R10', level: 3 });

    const first = screen.getByLabelText('Valor de la etapa 1');
    await userEvent.clear(first);
    await userEvent.type(first, '15');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.schedules.get(R10.id))?.intervals[0]).toEqual({ value: 15, unit: 'min' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });

  it('se puede añadir y quitar etapas', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('heading', { name: 'R10', level: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Añadir etapa' }));
    expect(screen.getAllByLabelText(/Valor de la etapa/)).toHaveLength(11);

    await userEvent.click(screen.getByLabelText('Quitar la etapa 11'));
    expect(screen.getAllByLabelText(/Valor de la etapa/)).toHaveLength(10);
  });

  it('no deja quedarse sin ninguna etapa', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('button', { name: /Adaptativo/ });
    await userEvent.click(screen.getByRole('button', { name: /Adaptativo/ }));

    // El preset adaptativo tiene dos: se puede quitar una, no las dos.
    await userEvent.click(screen.getByLabelText('Quitar la etapa 2'));
    expect(screen.getByLabelText('Quitar la etapa 1')).toBeDisabled();
  });

  it('cambia las reglas de calificación', async () => {
    renderAt(<Schedules />, '/horarios');
    await screen.findByRole('heading', { name: 'R10', level: 3 });

    await userEvent.selectOptions(screen.getByLabelText(/«Otra vez» hace/), 'back1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.schedules.get(R10.id))?.rules.againAction).toBe('back1');
    });
  });
});

describe('Biblioteca', () => {
  it('lista todos los ítems con su estado', async () => {
    renderAt(<Library />, '/biblioteca');
    expect(await screen.findByText('3 ítems · 0 sin asignar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 resultados');
    // Dentro de la tabla: «Nuevo» también es una opción del filtro de estado.
    expect(within(screen.getByRole('table')).getAllByText('Nuevo')).toHaveLength(3);
  });

  it('busca por texto', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.type(screen.getByRole('searchbox'), 'itm-2');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    });
    expect(screen.getByText('Ítem itm-2')).toBeInTheDocument();
  });

  it('filtra por estado', async () => {
    await applyGrade('itm-1', 'good', new Date(), {}, db);
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'learning');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    });
  });

  it('filtra por zona', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.selectOptions(screen.getByLabelText('Zona'), 'zon-b');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    });
  });

  it('enseña la bandeja de los que no están en ningún punto', async () => {
    await db.items.put(item('itm-suelto', null, { title: 'Suelto' }));
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('4 ítems · 1 sin asignar');

    await userEvent.click(screen.getByLabelText('Solo sin asignar'));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 resultado');
    });
    expect(screen.getByText('Suelto')).toBeInTheDocument();
  });

  it('pausa en lote', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.click(screen.getByLabelText('Seleccionar Ítem itm-1'));
    await userEvent.click(screen.getByLabelText('Seleccionar Ítem itm-2'));
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    await waitFor(async () => {
      expect((await db.reviewStates.get('itm-1'))?.suspended).toBe(true);
      expect((await db.reviewStates.get('itm-2'))?.suspended).toBe(true);
    });
  });

  it('quita del punto en lote, sin borrar el ítem', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.click(screen.getByLabelText('Seleccionar Ítem itm-3'));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar del punto' }));

    await waitFor(async () => {
      expect((await db.items.get('itm-3'))?.locusId).toBeNull();
    });
    expect(await db.items.count()).toBe(3);
  });

  it('borra en lote', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.click(screen.getByLabelText('Seleccionar Ítem itm-1'));
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));

    await waitFor(async () => {
      expect(await db.items.count()).toBe(2);
    });
  });

  it('avisa si el filtro no deja nada', async () => {
    renderAt(<Library />, '/biblioteca');
    await screen.findByText('3 ítems · 0 sin asignar');

    await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
    expect(await screen.findByText('Ningún ítem cumple el filtro.')).toBeInTheDocument();
  });

  it('muestra los pausados con su estado', async () => {
    await setSuspended('itm-1', true, db);
    renderAt(<Library />, '/biblioteca');
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Pausado')).toBeInTheDocument();
    });
  });
});

describe('Estadísticas', () => {
  it('cuenta los repasos y pinta la previsión', async () => {
    await applyGrade('itm-1', 'good', new Date(), {}, db);
    renderAt(<Stats />, '/estadisticas');

    expect(await screen.findByText(/1 repaso registrado/)).toBeInTheDocument();
    expect(screen.getByLabelText('Repasos previstos para 30 días')).toBeInTheDocument();
  });

  it('reparte los puntos por estado', async () => {
    renderAt(<Stats />, '/estadisticas');
    await screen.findByRole('heading', { name: 'Reparto de los puntos' });
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('calcula la retención por zona en cuanto hay repasos', async () => {
    const now = new Date();
    await applyGrade('itm-1', 'good', now, {}, db);
    await applyGrade('itm-2', 'again', now, {}, db);
    renderAt(<Stats />, '/estadisticas');

    await screen.findByRole('heading', { name: 'Retención por zona' });
    // Los dos ítems están en la zona A: uno acertado de dos → 50 %.
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('sin repasos, lo dice en vez de inventar', async () => {
    renderAt(<Stats />, '/estadisticas');
    expect(await screen.findByText(/Todavía no hay repasos suficientes/)).toBeInTheDocument();
  });
});
