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
    // Armar la cola tarda hasta 6 s en WebKit: sin esperarla, las teclas se
    // pierden contra la pantalla de carga.
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
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
    // La cola no es instantanea; en WebKit tarda hasta 6 s.
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
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
    ['/cuerpos', 'Mis cuerpos'],
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

test.describe('uso en móvil', () => {
  test('entrar directo a la sesión espera a la siembra', async ({ page }) => {
    // Un marcador o la app instalada abren una ruta sin pasar por Hoy: la cola
    // se armaba antes de que la semilla terminara y salía «nada que repasar».
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
  });

  test('la cabecera no se come la pantalla', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await freshApp(page);
    await expect(page.getByRole('link', { name: /Repasar ahora/ })).toBeVisible(SEEDED);

    const head = await page.evaluate(() => {
      const el = document.querySelector('.shell__head');
      return el ? Math.round(el.getBoundingClientRect().height) : 0;
    });
    // Ocho destinos envueltos ocupaban 144 px; en una fila que se desliza, ~50.
    expect(head).toBeLessThan(80);
  });

  test('en la sesión se ve el contenido sin desplazar', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect(page.getByText(/Patrones del sonido/)).toBeVisible();

    const geo = await page.evaluate(() => {
      const card = document.querySelector('.ses__card');
      return {
        cardTop: card ? Math.round(card.getBoundingClientRect().top) : 9999,
        viewport: window.innerHeight,
      };
    });
    // El mapa se quedaba media pantalla y la tarjeta empezaba fuera de vista.
    expect(geo.cardTop).toBeLessThan(geo.viewport - 150);
  });

  test('los cuatro botones de calificar caben y miden lo que pide el diseño', async ({ page }) => {
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');

    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('.grade')].map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) };
      }),
    );
    expect(sizes).toHaveLength(4);
    for (const size of sizes) {
      expect(size.h).toBeGreaterThanOrEqual(64);
      expect(size.right).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    }
  });
});

/**
 * La columna lateral pegada es un patrón de escritorio: cuando la rejilla se
 * colapsa a una columna, un elemento `sticky` se desplaza SOBRE el contenido
 * que le sigue y lo tapa. Pasó en cinco pantallas a la vez y no lo ve ningún
 * test de unidad, porque depende del tamaño real de la ventana (D-077).
 */
test.describe('leer el panel en el teléfono', () => {
  const PANELES = [
    { ruta: '/inspector', espera: /45 puntos/, lado: '.insp__map', panel: '.insp__detail' },
    { ruta: '/editor', espera: /45 puntos/, lado: '.pae__map', panel: '.pae__panel' },
    { ruta: '/cuerpos', espera: /cuerpo/i, lado: '.bst__map', panel: '.bst__panel' },
    { ruta: '/punto/loc-fonetica45-01', espera: /Pelo/, lado: '.lce__map', panel: '.lce__panel' },
  ];

  for (const caso of PANELES) {
    test(`en ${caso.ruta} el cuerpo no tapa el panel`, async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Repasar ahora/ })).toBeVisible(SEEDED);
      await page.goto(caso.ruta);
      await expect(page.getByText(caso.espera).first()).toBeVisible(SEEDED);
      // El mapa tarda en aparecer mas que el texto que lo anuncia.
      await page.locator(caso.lado).waitFor(SEEDED);
      await page.locator(caso.panel).waitFor(SEEDED);

      // Desplazarse al panel es justo lo que hace el usuario para leerlo.
      await page.evaluate((s) => {
        document.querySelector(s)?.scrollIntoView({ block: 'start' });
      }, caso.panel);

      const geo = await page.evaluate(
        ([sl, sp]) => {
          const lado = document.querySelector(sl);
          const panel = document.querySelector(sp);
          if (!lado || !panel) return null;
          const a = lado.getBoundingClientRect();
          const b = panel.getBoundingClientRect();
          // ¿Qué elemento recibiría el toque sobre la cabecera del panel?
          const x = b.left + b.width / 2;
          const y = Math.max(4, Math.min(window.innerHeight - 4, b.top + 24));
          const encima = document.elementFromPoint(x, y);
          return {
            solape: Math.round(Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))),
            esDelPanel: panel.contains(encima),
            altoLado: Math.round(a.height),
            ventana: window.innerHeight,
          };
        },
        [caso.lado, caso.panel] as const,
      );

      expect(geo).not.toBeNull();
      expect(geo?.solape).toBe(0);
      expect(geo?.esDelPanel).toBe(true);
      // Y la columna no puede medir más que la pantalla.
      expect(geo?.altoLado ?? 0).toBeLessThan(geo?.ventana ?? 0);
    });
  }

  test('tocar un punto trae el detalle a la vista', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/inspector');
    await expect(page.getByText(/45 puntos/)).toBeVisible(SEEDED);

    const antes = await page.evaluate(() => {
      const el = document.querySelector('.insp__detail');
      return el ? Math.round(el.getBoundingClientRect().top) : 0;
    });
    // Nace por debajo del borde inferior: tocar un pin no se notaba.
    expect(antes).toBeGreaterThan(600);

    await page.locator('.insp__map [role="button"]').first().click({ force: true });

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const el = document.querySelector('.insp__detail');
            return el ? Math.round(el.getBoundingClientRect().top) : 9999;
          }),
        { timeout: 5000 },
      )
      .toBeLessThan(120);
  });
});

test.describe('la sesión en el teléfono', () => {
  test('«Revelar» se alcanza sin desplazar en las dos fases', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);

    for (const fase of ['señalar', 'escena']) {
      const geo = await page.evaluate(() => {
        const b = document.querySelector('.ses__reveal');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { bottom: Math.round(r.bottom), ventana: window.innerHeight };
      });
      // Dentro de la tarjeta caía 68 px por debajo del borde.
      expect(geo, `fase ${fase}`).not.toBeNull();
      expect(geo?.bottom ?? 9999, `fase ${fase}`).toBeLessThanOrEqual(geo?.ventana ?? 0);
      await page.getByRole('button', { name: /^Revelar/ }).click();
    }
  });

  test('al revelar el contenido hay sitio de verdad para leerlo', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect(page.getByText(/Patrones del sonido/)).toBeVisible();

    // La vista aterriza en la tarjeta: la pregunta arriba y la respuesta debajo.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const card = document.querySelector('.ses__card');
            const grades = document.querySelector('.ses__grades');
            if (!card || !grades) return -1;
            const top = card.getBoundingClientRect().top;
            return Math.round(grades.getBoundingClientRect().top - Math.max(top, 0));
          }),
        { timeout: 5000 },
      )
      // Antes quedaban 199 px; con el cuerpo encogido y el salto, más de 400.
      .toBeGreaterThan(400);

    // La pregunta sigue visible mientras se lee la respuesta.
    const front = await page.evaluate(() => {
      const el = document.querySelector('.ses__front');
      return el ? Math.round(el.getBoundingClientRect().top) : -9999;
    });
    expect(front).toBeGreaterThan(0);
  });

  test('el cuerpo manda al recordar y se encoge al leer', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);

    const alto = async (): Promise<number> =>
      page.evaluate(() => {
        const el = document.querySelector('.ses__bodymap');
        return el ? Math.round(el.getBoundingClientRect().height) : 0;
      });

    const recordando = await alto();
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect(page.getByText(/Patrones del sonido/)).toBeVisible();
    const leyendo = await alto();

    // El diseño lo fija en 440 → 200 px (`stageH` de PalacioApp.dc.html).
    expect(recordando).toBeGreaterThan(300);
    expect(leyendo).toBeLessThan(recordando * 0.6);
  });
});

/**
 * El desborde que el `overflow-x: clip` del shell se tragaba.
 *
 * `grid-template-columns: 1fr` significa `minmax(auto, 1fr)`: el mínimo es el
 * min-content, así que la columna crecía MÁS que la pantalla —439 px en un
 * iPhone de 390— y el shell recortaba lo que sobraba sin dejar forma de
 * llegar a ello. Como el documento nunca crecía, ninguna medida lo delataba:
 * hay que medir contra la caja del shell, no contra el documento (D-081).
 */
test.describe('nada se pierde por la derecha', () => {
  const RUTAS = ['/', '/inspector', '/sesion', '/editor', '/biblioteca', '/datos'];

  for (const ruta of RUTAS) {
    test(`en ${ruta} nada se sale de la caja`, async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Repasar ahora/ })).toBeVisible(SEEDED);
      await page.goto(ruta);
      await page.waitForTimeout(600);

      const fuera = await page.evaluate(() => {
        const shell = document.querySelector('.shell');
        if (!shell) return ['sin shell'];
        const caja = shell.getBoundingClientRect();
        const limite = caja.right - parseFloat(getComputedStyle(shell).paddingRight);
        const malos: string[] = [];
        for (const el of shell.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          /*
           * Solo cuenta lo que de verdad se pierde. No cuentan: lo que vive en
           * un contenedor que ya lo recorta o lo desplaza —una tabla con
           * scroll propio, el interior del SVG con la cámara—, lo que está
           * oculto con `clip-path` (la cabecera que queda para el lector de
           * pantalla) y las barras fijas, que ocupan todo el ancho a propósito.
           */
          let contenido = false;
          for (let p: Element | null = el; p; p = p.parentElement) {
            const cs = getComputedStyle(p);
            const ov = cs.overflowX;
            if (ov === 'auto' || ov === 'scroll' || ov === 'hidden' || ov === 'clip') {
              contenido = true;
              break;
            }
            if (cs.clipPath !== 'none' || cs.position === 'fixed') {
              contenido = true;
              break;
            }
          }
          if (!contenido && b.right - limite > 2) {
            const cls = typeof el.className === 'string' ? el.className : '';
            malos.push(`${el.tagName.toLowerCase()}.${cls} +${Math.round(b.right - limite)}px`);
          }
        }
        return malos;
      });

      expect(fuera).toEqual([]);
    });
  }

  test('la navegación conserva un ancho usable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Repasar ahora/ })).toBeVisible(SEEDED);

    const nav = await page.evaluate(() => {
      const el = document.querySelector('.tabs');
      return el ? Math.round(el.clientWidth) : 0;
    });
    // El título no se encogía y dejaba la navegación en 93 px de un iPhone SE.
    expect(nav).toBeGreaterThan(200);
  });

  test('una tabla ancha se lee sin arrastrarla', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/inspector');
    await expect(page.getByText(/45 puntos/)).toBeVisible(SEEDED);
    // El punto 2 trae la tabla de «minimal pairs», de ocho columnas.
    await page.locator('.insp__rbtn').nth(1).click();
    await expect(page.getByText(/Minimal pairs/)).toBeVisible();

    const tablas = await page.evaluate(() =>
      [...document.querySelectorAll('.blk-table')].map((fig) => {
        const sc = fig.querySelector('.blk-table__scroll');
        const tb = fig.querySelector('table');
        return {
          titulo: fig.querySelector('figcaption')?.textContent ?? '',
          oculto: sc && tb ? Math.round(tb.scrollWidth - sc.clientWidth) : 0,
        };
      }),
    );

    // De los minimal pairs solo se veía el 54 %: 270 px había que arrastrarlos.
    expect(tablas.length).toBeGreaterThan(0);
    for (const t of tablas) expect(t.oculto, t.titulo).toBeLessThanOrEqual(2);
  });

  test('la barra de acción no deja nada inalcanzable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);

    const tapado = await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      const barra = document.querySelector('.ses__act')?.getBoundingClientRect();
      if (!barra) return -1;
      let peor = 0;
      for (const el of document.querySelectorAll('.ses__card *')) {
        if (el.children.length > 0 || el.textContent.trim() === '') continue;
        const b = el.getBoundingClientRect();
        peor = Math.max(peor, Math.min(b.bottom, barra.bottom) - Math.max(b.top, barra.top));
      }
      return Math.round(peor);
    });

    // Con la barra pegada, «Revelar» se montaba sobre el texto de la tarjeta.
    expect(tapado).toBe(0);
  });

  test('la cámara no deja media caja en negro', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('movil'), 'solo aplica al móvil');
    await page.goto('/sesion');
    await expect(page.getByText('1 / 20')).toBeVisible(SEEDED);

    const camara = await page.evaluate(() => {
      // Es un atributo del SVG, no un estilo: el `transform` calculado de un
      // <g> no se lee igual en WebKit que en Chromium.
      const t = document.querySelector('.bodymap__camera')?.getAttribute('transform');
      if (t === null || t === undefined) return null;
      const m = /translate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(t);
      if (!m) return null;
      return { tx: Number(m[1]), ty: Number(m[2]) };
    });

    // Sin acotar, el punto 1 daba ty positivo y empujaba el cuerpo abajo.
    expect(camara).not.toBeNull();
    expect(camara?.tx ?? 1).toBeLessThanOrEqual(0.5);
    expect(camara?.ty ?? 1).toBeLessThanOrEqual(0.5);
  });
});
