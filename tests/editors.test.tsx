import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { clearAll, db, ensurePresets, importBundle, listLoci } from '@/db';
import { ItemEditor } from '@/features/item-editor/ItemEditor';
import { LocusEditor } from '@/features/locus/LocusEditor';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { PalaceEditor } from '@/features/palace-editor/PalaceEditor';
import { item, miniBundle } from './db/helpers';
import { renderAt } from './render';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

const renderItem = (id: string) =>
  renderAt(
    <Routes>
      <Route path="/item/:itemId" element={<ItemEditor />} />
    </Routes>,
    `/item/${id}`,
  );

const renderLocus = (id: string) =>
  renderAt(
    <Routes>
      <Route path="/punto/:locusId" element={<LocusEditor />} />
    </Routes>,
    `/punto/${id}`,
  );

describe('Editor de ítem', () => {
  it('carga el ítem y lo guarda al editar', async () => {
    renderItem('itm-1');
    const title = await screen.findByLabelText('Título');
    expect(title).toHaveValue('Ítem itm-1');

    await userEvent.clear(title);
    await userEvent.type(title, 'Present Perfect');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.items.get('itm-1'))?.title).toBe('Present Perfect');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });

  it('no guarda nada hasta que se pulsa Guardar', async () => {
    renderItem('itm-1');
    const title = await screen.findByLabelText('Título');
    await userEvent.type(title, ' editado');

    expect((await db.items.get('itm-1'))?.title).toBe('Ítem itm-1');
  });

  it('añade un bloque de cada tipo y lo refleja en la vista previa', async () => {
    renderItem('itm-1');
    await screen.findByLabelText('Título');

    await userEvent.click(screen.getByRole('button', { name: '+ Texto' }));
    const textarea = screen.getByLabelText(/Texto \(admite/);
    await userEvent.type(textarea, 'Hola **mundo**');

    const preview = screen.getByRole('complementary');
    expect(within(preview).getByText('mundo')).toBeInTheDocument();
  });

  it('edita una tabla como texto y la cuadra', async () => {
    renderItem('itm-1');
    await screen.findByLabelText('Título');

    await userEvent.click(screen.getByRole('button', { name: '+ Tabla' }));
    const area = screen.getByLabelText(/primera línea las columnas/);
    await userEvent.clear(area);
    await userEvent.paste('ES | EN | IPA\ncasa | house\nperro | dog | dɒɡ');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(async () => {
      const stored = await db.items.get('itm-1');
      const block = stored?.blocks[0];
      expect(block?.type).toBe('table');
      if (block?.type === 'table') {
        expect(block.columns).toEqual(['ES', 'EN', 'IPA']);
        // La fila corta se rellena hasta el ancho de la cabecera.
        expect(block.rows).toEqual([
          ['casa', 'house', ''],
          ['perro', 'dog', 'dɒɡ'],
        ]);
      }
    });
  });

  it('reordena y quita bloques', async () => {
    renderItem('itm-1');
    await screen.findByLabelText('Título');

    await userEvent.click(screen.getByRole('button', { name: '+ Texto' }));
    await userEvent.click(screen.getByRole('button', { name: '+ Nota' }));
    expect(screen.getByLabelText('Subir el bloque 2')).toBeEnabled();

    await userEvent.click(screen.getByLabelText('Quitar el bloque 1'));
    expect(screen.getAllByLabelText(/Quitar el bloque/)).toHaveLength(1);
  });

  it('cambia el punto al que está asignado', async () => {
    renderItem('itm-1');
    await screen.findByLabelText('Título');

    await userEvent.selectOptions(screen.getByLabelText('Punto del palacio'), 'loc-3');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.items.get('itm-1'))?.locusId).toBe('loc-3');
    });
  });

  it('lo deja sin asignar', async () => {
    renderItem('itm-1');
    await screen.findByLabelText('Título');

    await userEvent.selectOptions(screen.getByLabelText('Punto del palacio'), '');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.items.get('itm-1'))?.locusId).toBeNull();
    });
  });

  it('avisa si el ítem no existe', async () => {
    renderItem('no-existe');
    expect(await screen.findByText('Ese ítem no existe')).toBeInTheDocument();
  });
});

describe('Detalle del punto', () => {
  it('muestra el punto con su zona y sus ítems', async () => {
    renderLocus('loc-1');
    expect(await screen.findByRole('heading', { name: /Parte 1/ })).toBeInTheDocument();
    expect(screen.getByText(/Zona zon-a · lado frontal/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ítem itm-1' })).toBeInTheDocument();
  });

  it('edita el ancla y la guarda', async () => {
    renderLocus('loc-1');
    const anchor = await screen.findByLabelText(/Ancla/);
    await userEvent.type(anchor, '/iː/ · CHEESE');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(async () => {
      expect((await db.loci.get('loc-1'))?.anchor?.text).toBe('/iː/ · CHEESE');
    });
  });

  it('lista los objetos de escena y respeta el máximo de cinco', async () => {
    renderLocus('loc-1');
    await screen.findByRole('heading', { name: /Parte 1/ });
    expect(
      screen.getByText('2 de 5. Son las imágenes que codifican el contenido;', { exact: false }),
    ).toBeInTheDocument();

    for (const text of ['Tres', 'Cuatro', 'Cinco']) {
      await userEvent.type(screen.getByLabelText('Nuevo objeto de escena'), text);
      await userEvent.click(screen.getByRole('button', { name: 'Añadir' }));
      await waitFor(() => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    }
    // Con cinco, el formulario desaparece.
    await waitFor(() => {
      expect(screen.queryByLabelText('Nuevo objeto de escena')).not.toBeInTheDocument();
    });
    expect(await db.sceneObjects.count()).toBe(5);
  });

  it('quita un objeto de escena', async () => {
    renderLocus('loc-1');
    await screen.findByRole('heading', { name: /Parte 1/ });
    await userEvent.click(screen.getByLabelText('Quitar Globo'));

    await waitFor(async () => {
      expect(await db.sceneObjects.count()).toBe(1);
    });
  });

  it('crea un ítem en el punto', async () => {
    renderLocus('loc-2');
    await screen.findByRole('heading', { name: /Parte 2/ });
    await userEvent.click(screen.getByRole('button', { name: 'Añadir un ítem aquí' }));

    await waitFor(async () => {
      expect(await db.items.where('locusId').equals('loc-2').count()).toBe(2);
    });
  });

  it('avisa si el punto no existe', async () => {
    renderLocus('no-existe');
    expect(await screen.findByText('Ese punto no existe')).toBeInTheDocument();
  });
});

describe('Editor de palacio', () => {
  it('abre en modo puntos con la ruta a la vista', async () => {
    renderAt(<PalaceEditor />, '/editor');
    expect(await screen.findByText('3 puntos · 2 zonas')).toBeInTheDocument();
    expect(screen.getByText(/Toca el cuerpo para crear un punto/)).toBeInTheDocument();
  });

  it('borra un punto sin borrar sus ítems', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText('3 puntos · 2 zonas');

    await userEvent.click(screen.getByLabelText('Borrar Parte 1'));
    await waitFor(async () => {
      expect(await db.loci.count()).toBe(2);
    });
    expect((await db.items.get('itm-1'))?.locusId).toBeNull();
  });

  it('reordena la ruta', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText('3 puntos · 2 zonas');

    await userEvent.click(screen.getByRole('tab', { name: 'Ruta' }));
    await userEvent.click(screen.getByLabelText('Bajar Parte 1'));

    await waitFor(async () => {
      const loci = await listLoci('pal-1', db);
      expect(loci.map((locus) => locus.partName)).toEqual(['Parte 2', 'Parte 1', 'Parte 3']);
    });
  });

  it('renumera la ruta', async () => {
    await db.loci.update('loc-3', { routeNo: 9 });
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText('3 puntos · 2 zonas');

    await userEvent.click(screen.getByRole('tab', { name: 'Ruta' }));
    await userEvent.click(screen.getByRole('button', { name: /Renumerar/ }));

    await waitFor(async () => {
      const loci = await listLoci('pal-1', db);
      expect(loci.map((locus) => locus.routeNo)).toEqual([1, 2, 3]);
    });
  });

  it('pinta zonas tocando los puntos', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText('3 puntos · 2 zonas');

    await userEvent.click(screen.getByRole('tab', { name: 'Zonas' }));
    await userEvent.click(screen.getByRole('button', { name: /^Zona zon-b/ }));
    await userEvent.click(screen.getByRole('button', { name: /^1\. Parte 1/ }));

    await waitFor(async () => {
      expect((await db.loci.get('loc-1'))?.zoneId).toBe('zon-b');
    });
  });

  it('añade y borra zonas sin borrar sus puntos', async () => {
    renderAt(<PalaceEditor />, '/editor');
    await screen.findByText('3 puntos · 2 zonas');
    await userEvent.click(screen.getByRole('tab', { name: 'Zonas' }));

    await userEvent.click(screen.getByRole('button', { name: 'Añadir zona' }));
    await waitFor(async () => {
      expect(await db.zones.count()).toBe(3);
    });

    await userEvent.click(screen.getByLabelText('Borrar Zona zon-a'));
    await waitFor(async () => {
      expect(await db.zones.count()).toBe(2);
    });
    expect(await db.loci.count()).toBe(3);
    expect((await db.loci.get('loc-1'))?.zoneId).toBeUndefined();
  });
});

describe('Onboarding', () => {
  it('recorre los cuatro pasos', async () => {
    renderAt(<Onboarding />, '/bienvenida');
    expect(
      await screen.findByRole('heading', { name: 'Un palacio de la memoria sobre tu cuerpo' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Tu palacio' })).toBeInTheDocument();
    expect(screen.getByText(/3 puntos/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Tu ritmo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /R10/ })).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'El primer repaso' })).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('se puede volver atrás', async () => {
    renderAt(<Onboarding />, '/bienvenida');
    await screen.findByRole('heading', { name: /Un palacio de la memoria/ });
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByRole('heading', { name: /Un palacio de la memoria/ })).toBeInTheDocument();
  });

  it('guarda el horario elegido al terminar', async () => {
    renderAt(<Onboarding />, '/bienvenida');
    await screen.findByRole('heading', { name: /Un palacio de la memoria/ });
    for (let i = 0; i < 2; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    }
    await userEvent.click(screen.getByRole('radio', { name: /Clásico/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Empezar a repasar' }));

    await waitFor(async () => {
      expect(await db.settings.get('defaultScheduleId')).toMatchObject({
        value: 'sch-clasico',
      });
      expect(await db.settings.get('onboarded')).toMatchObject({ value: true });
    });
  });
});

describe('sin palacio', () => {
  it('el editor lo dice en vez de romperse', async () => {
    await clearAll(db);
    await importBundle({ version: 1, items: [item('itm-x', null)] }, db);
    renderAt(<PalaceEditor />, '/editor');
    expect(await screen.findByText('Todavía no hay ningún palacio')).toBeInTheDocument();
  });
});
