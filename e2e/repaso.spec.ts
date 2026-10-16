import { expect, test, type Page } from '@playwright/test';

/**
 * El flujo de repaso de punta a punta, en un navegador real y contra el build
 * de producción: la semilla se siembra en IndexedDB al primer arranque.
 */

/**
 * Abre la app en una base vacía.
 *
 * Playwright da un contexto nuevo por test, así que IndexedDB ya empieza
 * limpia: **no hay que borrarla a mano**. Hacerlo tras cargar la app competía
 * con la siembra, que la tiene abierta, y dejaba la base a medias.
 */
async function freshApp(page: Page): Promise<void> {
  await page.goto('/');
}

const SEEDED = { timeout: 30_000 };

test.describe('la app arranca', () => {
  test('siembra el palacio de fonética y lo muestra en Hoy', async ({ page }) => {
    await freshApp(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Palacio Corporal' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Repasar ahora \(\d+\)/ })).toBeVisible(SEEDED);
    await expect(page.getByText('nuevos')).toBeVisible();
  });

  test('no deja errores en la consola', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => {
      problems.push(error.message);
    });

    await freshApp(page);
    await expect(page.getByRole('link', { name: /Repasar ahora/ })).toBeVisible(SEEDED);
    expect(problems).toEqual([]);
  });

  test('pinta los 45 puntos del palacio', async ({ page }) => {
    await freshApp(page);
    await page.getByRole('link', { name: 'Palacio' }).click();

    await expect(page.getByText('45 puntos · 44 con contenido · 5 zonas')).toBeVisible(SEEDED);
    await expect(page.getByRole('button', { name: /^2\. Frente/ })).toHaveCount(1);
  });
});

test.describe('una tarjeta completa', () => {
  test('señalar, revelar, calificar y aceptar', async ({ page }) => {
    await freshApp(page);
    await page.getByRole('link', { name: /Repasar ahora/ }).click(SEEDED);

    // Fase 1: el punto señalado, sin nada revelado.
    await expect(page.getByText('1 / 20')).toBeVisible();
    await expect(page.getByText(/Intenta recordar la escena/)).toBeVisible();

    // Fases 2 y 3: la escena y después el contenido.
    await page.getByRole('button', { name: /Revelar/ }).click();
    await expect(page.getByText('YES', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Revelar/ }).click();
    await expect(page.getByText(/Patrones del sonido/)).toBeVisible();

    // Calificar abre la hoja; todavía no se ha guardado nada.
    await page.getByRole('button', { name: /^Bien ·/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Próximo repaso' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('etapa 1/10')).toBeVisible();

    await sheet.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('2 / 20')).toBeVisible();
  });

  test('el teclado basta: espacio revela y 1–4 califican', async ({ page }) => {
    await freshApp(page);
    await page.getByRole('link', { name: /Repasar ahora/ }).click(SEEDED);
    await expect(page.getByText('1 / 20')).toBeVisible();

    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect(page.getByText(/Patrones del sonido/)).toBeVisible();

    await page.keyboard.press('3');
    await expect(page.getByRole('dialog', { name: 'Próximo repaso' })).toBeVisible();
  });

  test('«Avanzado» deja fijar la fecha a mano', async ({ page }) => {
    await freshApp(page);
    await page.getByRole('link', { name: /Repasar ahora/ }).click(SEEDED);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: /^Bien ·/ }).click();

    const sheet = page.getByRole('dialog', { name: 'Próximo repaso' });
    await expect(sheet.getByRole('button', { name: '+3 d' })).toBeHidden();
    await sheet.getByRole('button', { name: 'Avanzado' }).click();
    await expect(sheet.getByRole('button', { name: '+3 d' })).toBeVisible();

    await sheet.getByRole('button', { name: '+3 d' }).click();
    await expect(page.getByText('2 / 20')).toBeVisible();
  });
});

test.describe('lo que se estudia queda guardado', () => {
  async function gradeFirstCard(page: Page): Promise<void> {
    await page.getByRole('link', { name: /Repasar ahora/ }).click(SEEDED);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: /^Bien ·/ }).click();
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(page.getByText('2 / 20')).toBeVisible();
  }

  test('el punto cambia de estado y sobrevive a recargar', async ({ page }) => {
    await freshApp(page);
    await gradeFirstCard(page);

    await page.goto('/inspector');
    await expect(page.getByRole('button', { name: /^1\. Pelo.*Aprendiendo/ })).toBeVisible(SEEDED);

    // Y tras recargar sigue ahí: está en IndexedDB, no en memoria.
    await page.reload();
    await expect(page.getByRole('button', { name: /^1\. Pelo.*Aprendiendo/ })).toBeVisible(SEEDED);
  });

  test('la racha aparece en Hoy', async ({ page }) => {
    await freshApp(page);
    await gradeFirstCard(page);

    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(page.getByText('1 día seguidos estudiando')).toBeVisible();
  });
});

test.describe('las demás pantallas abren', () => {
  const SCREENS = [
    ['Editor', '45 puntos'],
    ['Biblioteca', 'ítems'],
    ['Progreso', 'Previsión de 30 días'],
    ['Horarios', 'Horarios de repaso'],
    ['Datos', 'Importar y exportar'],
  ] as const;

  for (const [label, check] of SCREENS) {
    test(`${label} se abre sin errores`, async ({ page }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => {
        problems.push(error.message);
      });
      await freshApp(page);
      await page.getByRole('link', { name: label }).click(SEEDED);
      await expect(page.getByText(check, { exact: false }).first()).toBeVisible(SEEDED);
      expect(problems).toEqual([]);
    });
  }
});

test.describe('maquetación móvil', () => {
  const ROUTES = [
    ['/', 'Repasar ahora'],
    ['/inspector', '45 puntos'],
    ['/editor', '45 puntos'],
    ['/biblioteca', 'ítems'],
    ['/estadisticas', 'Previsión de 30 días'],
    ['/horarios', 'Horarios de repaso'],
    ['/datos', 'Importar y exportar'],
    ['/bienvenida', 'palacio de la memoria'],
  ] as const;

  for (const [route, check] of ROUTES) {
    test(`${route} no desborda a lo ancho`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText(check, { exact: false }).first()).toBeVisible(SEEDED);

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerHeight: window.innerHeight,
        visualHeight: Math.round(window.visualViewport?.height ?? window.innerHeight),
      }));

      // Si el contenido es más ancho que el viewport, el navegador móvil aleja
      // el zoom de toda la app y `innerHeight` se dispara sobre el visual.
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.innerHeight).toBeLessThanOrEqual(metrics.visualHeight + 1);
    });
  }
});

test.describe('la lista de ruta', () => {
  test('se lee en orden, en una sola columna', async ({ page }) => {
    await page.goto('/inspector');
    await expect(page.getByText('45 puntos', { exact: false })).toBeVisible(SEEDED);

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('.insp__route');
      if (!list) return null;
      const rows = [...list.querySelectorAll('li')].map((node) => {
        const box = node.getBoundingClientRect();
        return { top: Math.round(box.top), left: Math.round(box.left) };
      });
      return { count: rows.length, rows };
    });

    expect(geometry?.count).toBe(45);
    // Un recorrido es un orden: en varias columnas la rejilla se llena por
    // filas y la izquierda quedaba 1, 3, 5, 7… Cada punto va debajo del anterior.
    const rows = geometry?.rows ?? [];
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.top, `punto ${String(i + 1)}`).toBeGreaterThan(rows[i - 1]!.top);
      expect(rows[i]!.left, `punto ${String(i + 1)}`).toBe(rows[0]!.left);
    }
  });
});
