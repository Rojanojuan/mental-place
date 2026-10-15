import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, db, ensurePresets, importBundle, listUnassignedItems } from '@/db';
import { ImportExport } from '@/features/import-export/ImportExport';
import { item, miniBundle } from './db/helpers';
import { renderAt } from './render';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

const upload = async (name: string, text: string): Promise<void> => {
  const input = screen.getByLabelText(/Elegir archivo/);
  await userEvent.upload(input, new File([text], name, { type: 'application/json' }));
};

describe('Importar · JSON', () => {
  it('muestra la vista previa sin escribir nada', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'nuevo.json',
      JSON.stringify({ version: 1, items: [item('itm-nuevo', null, { templateId: 'tpl-libre' })] }),
    );

    expect(await screen.findByText('Vista previa')).toBeInTheDocument();
    expect(screen.getByText(/por crear/)).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Ítems/ })).toHaveTextContent('1');
    // La base no se toca hasta confirmar.
    expect(await db.items.count()).toBe(3);
  });

  it('distingue lo que crea de lo que sobrescribe', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'mezcla.json',
      JSON.stringify({
        version: 1,
        items: [
          item('itm-1', 'loc-1', { templateId: 'tpl-libre', title: 'Reemplazado' }),
          item('itm-nuevo', null, { templateId: 'tpl-libre' }),
        ],
      }),
    );

    await screen.findByText('Vista previa');
    const row = screen.getByRole('row', { name: /Ítems/ });
    expect(row).toHaveTextContent('1');
    expect(screen.getByText(/por sobrescribir/)).toBeInTheDocument();
  });

  it('escribe al confirmar', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'nuevo.json',
      JSON.stringify({ version: 1, items: [item('itm-nuevo', null, { templateId: 'tpl-libre' })] }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Importar' }));

    await waitFor(() => {
      expect(screen.getByText(/1 registro importado/)).toBeInTheDocument();
    });
    expect(await db.items.count()).toBe(4);
  });

  it('rechaza un archivo que no cumple el formato', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('malo.json', JSON.stringify({ version: 3, items: [] }));

    expect(await screen.findByText(/no cumple el formato/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument();
    expect(screen.getByText('version')).toBeInTheDocument();
  });

  it('avisa si el JSON está roto', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('roto.json', '{ esto no es json');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('resuelve el punto indicado por nombre', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'ref.json',
      JSON.stringify({
        version: 1,
        items: [{ ...item('itm-ref', null, { templateId: 'tpl-libre' }), locusRef: 'Parte 2' }],
      }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Importar' }));

    await waitFor(() => {
      expect(screen.getByText(/registro importado/)).toBeInTheDocument();
    });
    expect((await db.items.get('itm-ref'))?.locusId).toBe('loc-2');
  });

  it('lista los puntos que no supo resolver', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'ref.json',
      JSON.stringify({
        version: 1,
        items: [
          { ...item('itm-ref', null, { templateId: 'tpl-libre' }), locusRef: 'No existe este' },
        ],
      }),
    );

    expect(await screen.findByText('Puntos sin resolver')).toBeInTheDocument();
    expect(screen.getByText(/no encontrado/)).toBeInTheDocument();
    expect(screen.getByText(/1 ítem sin punto/)).toBeInTheDocument();

    // Se importa igual: el ítem entra sin asignar, el contenido no se pierde.
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));
    await waitFor(async () => {
      expect(await listUnassignedItems(db)).toHaveLength(1);
    });
  });

  it('se puede cancelar', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload(
      'nuevo.json',
      JSON.stringify({ version: 1, items: [item('itm-nuevo', null, { templateId: 'tpl-libre' })] }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Vista previa')).not.toBeInTheDocument();
    expect(await db.items.count()).toBe(3);
  });
});

describe('Importar · CSV', () => {
  const csv = [
    'titulo,frente,reverso,punto,prioridad',
    'Casa,house,casa,Parte 1,2',
    'Perro,dog,perro,Parte 2,1',
  ].join('\n');

  it('propone el mapeo leyendo las cabeceras', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('vocab.csv', csv);

    expect(await screen.findByText('Mapeo de columnas')).toBeInTheDocument();
    expect(screen.getByText('2 filas leídas.')).toBeInTheDocument();
    const title = screen.getByRole('combobox', { name: 'Título' });
    expect(title).toHaveValue('0');
    expect(screen.getByRole('combobox', { name: 'Punto' })).toHaveValue('3');
  });

  it('importa las filas con su punto resuelto', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('vocab.csv', csv);
    await userEvent.click(await screen.findByRole('button', { name: 'Importar' }));

    await waitFor(() => {
      expect(screen.getByText(/2 registros importados/)).toBeInTheDocument();
    });
    const imported = await db.items.where('templateId').equals('tpl-libre').toArray();
    const casa = imported.find((entry) => entry.title === 'Casa');
    expect(casa?.locusId).toBe('loc-1');
    expect(casa?.front).toBe('house');
    expect(casa?.priority).toBe(2);
  });

  it('cambiar el mapeo recalcula la vista previa', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('vocab.csv', csv);
    await screen.findByText('Mapeo de columnas');

    // Sin columna de punto, los ítems entran sin asignar.
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Punto' }), '');
    await waitFor(() => {
      expect(screen.queryByText('Puntos sin resolver')).not.toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));

    await waitFor(async () => {
      expect(await listUnassignedItems(db)).toHaveLength(2);
    });
  });

  it('reconoce el punto y coma como separador', async () => {
    renderAt(<ImportExport />, '/datos');
    await upload('vocab.csv', 'titulo;frente\nCasa;house');
    expect(await screen.findByText('1 fila leída.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Título' })).toHaveValue('0');
  });
});

describe('Exportar', () => {
  it('ofrece la copia completa y el CSV de ítems', async () => {
    renderAt(<ImportExport />, '/datos');
    expect(
      await screen.findByRole('button', { name: 'Copia de seguridad (JSON)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ítems en CSV' })).toBeInTheDocument();
  });
});
