import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyGrade,
  clearAll,
  db,
  ensurePresets,
  importBundle,
  listLogs,
  setSuspended,
} from '@/db';
import { Session } from '@/features/session/Session';
import { Today } from '@/features/today/Today';
import { item, locus, miniBundle, palace } from './db/helpers';
import { renderAt } from './render';

beforeEach(async () => {
  await clearAll(db);
  await importBundle(miniBundle(), db);
  await ensurePresets(db);
});

/** Una tarjeta con escena, anverso y reverso, para recorrer las tres fases. */
async function withContent(): Promise<void> {
  await db.items.put(
    item('itm-1', 'loc-1', {
      deckId: 'dck-1',
      priority: 1,
      front: '¿Qué guardas aquí?',
      back: 'La respuesta',
      blocks: [{ type: 'text', md: 'Contenido ampliado' }],
    }),
  );
}

describe('Sesión · las tres fases de una tarjeta', () => {
  it('empieza señalando el punto, sin revelar nada', async () => {
    await withContent();
    renderAt(<Session />, '/sesion');

    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Intenta recordar la escena/)).toBeInTheDocument();
    expect(screen.getByText('¿Qué guardas aquí?')).toBeInTheDocument();
    expect(screen.queryByText('La respuesta')).not.toBeInTheDocument();
    expect(screen.queryByText('Globo')).not.toBeInTheDocument();
  });

  it('revela primero la escena y después el contenido', async () => {
    await withContent();
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 3');

    await userEvent.click(screen.getByRole('button', { name: /Revelar la escena/ }));
    expect(screen.getByText('Globo')).toBeInTheDocument();
    expect(screen.queryByText('La respuesta')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Revelar el contenido/ }));
    expect(screen.getByText('La respuesta')).toBeInTheDocument();
    expect(screen.getByText('Contenido ampliado')).toBeInTheDocument();
  });

  it('el espacio también revela', async () => {
    await withContent();
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 3');

    await userEvent.keyboard(' ');
    expect(screen.getByText('Globo')).toBeInTheDocument();
    await userEvent.keyboard(' ');
    expect(screen.getByText('La respuesta')).toBeInTheDocument();
  });

  it('muestra los cuatro botones con su intervalo al llegar al contenido', async () => {
    await withContent();
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 3');
    await userEvent.keyboard(' ');
    await userEvent.keyboard(' ');

    for (const label of ['Otra vez', 'Difícil', 'Bien', 'Fácil']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label} ·`) })).toBeInTheDocument();
    }
    // Un ítem nuevo en R10: «fácil» salta a la etapa 2, que es 1 día.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fácil · 1 d' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Bien · 10 min' })).toBeInTheDocument();
  });
});

describe('Sesión · calificar y fijar el próximo repaso', () => {
  async function reachGrades(): Promise<void> {
    await withContent();
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 3');
    await userEvent.keyboard(' ');
    await userEvent.keyboard(' ');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bien · 10 min' })).toBeInTheDocument();
    });
  }

  it('al calificar sale la hoja con la propuesta y la etapa', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));

    const sheet = await screen.findByRole('dialog', { name: 'Próximo repaso' });
    expect(sheet).toBeInTheDocument();
    expect(screen.getByText(/Próximo repaso:/)).toBeInTheDocument();
    expect(screen.getByText('etapa 1/10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
  });

  it('nada se guarda hasta que el usuario acepta', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));
    await screen.findByRole('dialog', { name: 'Próximo repaso' });

    expect(await db.reviewLogs.count()).toBe(0);
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(0);
  });

  it('«Aceptar» guarda la calificación y pasa a la siguiente', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar' }));

    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(1);
    const logs = await listLogs('itm-1', db);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ grade: 'good', manual: false });
  });

  it('los ajustes están detrás de «Avanzado»', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));
    await screen.findByRole('button', { name: 'Aceptar' });

    expect(screen.queryByRole('button', { name: '+3 d' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Avanzado' }));

    for (const label of ['+10 min', 'Esta noche', 'Mañana', '+3 d', '+1 sem', '+1 mes']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Fecha y hora del próximo repaso')).toBeInTheDocument();
  });

  it('un atajo guarda la fecha a mano, con un solo log', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Avanzado' }));
    await userEvent.click(screen.getByRole('button', { name: '+3 d' }));

    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
    const logs = await listLogs('itm-1', db);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.manual).toBe(true);
    expect(logs[0]?.grade).toBe('good');
    // La etapa es la que dejó «bien»; solo cambió la fecha.
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(1);
  });

  it('se puede saltar a una etapa concreta del horario', async () => {
    await reachGrades();
    await userEvent.click(screen.getByRole('button', { name: 'Bien · 10 min' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Avanzado' }));
    await userEvent.click(screen.getByRole('button', { name: '6 · 30 d' }));

    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
    expect((await db.reviewStates.get('itm-1'))?.stage).toBe(6);
  });

  it('las teclas 1–4 califican', async () => {
    await reachGrades();
    await userEvent.keyboard('3');
    expect(await screen.findByRole('dialog', { name: 'Próximo repaso' })).toBeInTheDocument();
    expect(screen.getByText(/Bien/)).toBeInTheDocument();
  });
});

describe('Sesión · la cola', () => {
  it('recorre todas las tarjetas y termina con el resumen', async () => {
    renderAt(<Session />, '/sesion');

    for (let i = 1; i <= 3; i += 1) {
      // Esperar la tarjeta: hasta que monta, la hoja anterior sigue abierta y
      // el espacio no revela (es el guardia que evita calificar dos veces).
      await screen.findByText(`${String(i)} / 3`);
      await userEvent.keyboard(' ');
      await userEvent.keyboard(' ');
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^Bien ·/ })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /^Bien ·/ }));
      await userEvent.click(await screen.findByRole('button', { name: 'Aceptar' }));
    }

    expect(await screen.findByText('Sesión terminada')).toBeInTheDocument();
    expect(screen.getByText('3 tarjetas repasadas.')).toBeInTheDocument();
    expect(await db.reviewLogs.count()).toBe(3);
  });

  it('avisa cuando no hay nada que repasar', async () => {
    await setSuspended('itm-1', true, db);
    await setSuspended('itm-2', true, db);
    await setSuspended('itm-3', true, db);

    renderAt(<Session />, '/sesion');
    expect(await screen.findByText('No hay nada que repasar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hacer un recorrido' })).toBeInTheDocument();
  });

  it('el recorrido no filtra por vencimiento', async () => {
    // Los tres quedan programados a futuro: la cola de hoy estaría vacía.
    const now = new Date();
    for (const id of ['itm-1', 'itm-2', 'itm-3']) await applyGrade(id, 'easy', now, {}, db);

    renderAt(<Session />, '/sesion?scope=walk');
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
  });

  it('señala el punto de la tarjeta en el mapa', async () => {
    renderAt(<Session />, '/sesion');
    await screen.findByText('1 / 3');
    expect(screen.getByLabelText(/Punto señalado: Parte 1/)).toBeInTheDocument();
    // El pin del punto 1 queda enfocado por la cámara.
    expect(screen.getByRole('button', { name: /^1\. Parte 1/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Hoy', () => {
  it('cuenta lo pendiente y ofrece repasar', async () => {
    renderAt(<Today />, '/');
    expect(await screen.findByRole('link', { name: 'Repasar ahora (3)' })).toBeInTheDocument();
    expect(screen.getByText('nuevos')).toBeInTheDocument();
    expect(screen.getByText('Empieza hoy tu racha')).toBeInTheDocument();
  });

  it('cuenta la racha en cuanto hay un repaso', async () => {
    await applyGrade('itm-1', 'good', new Date(), {}, db);
    renderAt(<Today />, '/');
    expect(await screen.findByText('1 día seguidos estudiando')).toBeInTheDocument();
  });

  it('separa los vencidos de los nuevos', async () => {
    await applyGrade('itm-1', 'good', new Date(Date.now() - 3_600_000), {}, db);
    renderAt(<Today />, '/');
    await screen.findByRole('link', { name: /Repasar ahora/ });
    expect(screen.getByText('vencidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Repasar ahora (3)' })).toBeInTheDocument();
  });

  it('cuando no queda nada, propone un recorrido', async () => {
    const now = new Date();
    for (const id of ['itm-1', 'itm-2', 'itm-3']) await applyGrade(id, 'easy', now, {}, db);
    renderAt(<Today />, '/');
    expect(await screen.findByText(/Nada pendiente hoy/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'recorrido' })).toBeInTheDocument();
  });

  it('muestra la previsión de siete días', async () => {
    renderAt(<Today />, '/');
    expect(
      await screen.findByLabelText('Repasos previstos para los próximos 7 días'),
    ).toBeInTheDocument();
  });
});

describe('Hoy · palacio vacío', () => {
  it('no se rompe sin palacios', async () => {
    await clearAll(db);
    await importBundle(
      { version: 1, palaces: [palace('pal-x')], loci: [locus('loc-x', 'pal-x', 1)] },
      db,
    );
    renderAt(<Today />, '/');
    expect(await screen.findByText(/Nada pendiente hoy/)).toBeInTheDocument();
  });
});
