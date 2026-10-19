/**
 * Auditoría de accesibilidad, en un navegador de verdad.
 *
 * No usa axe ni ninguna dependencia nueva: comprueba a mano lo que de verdad
 * deja fuera a alguien que navega con teclado o con lector de pantalla, que es
 * un puñado corto de cosas y todas medibles.
 *
 * Uso:  node scripts/audit_a11y.mjs [url]
 */
import { chromium, devices } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const RUTAS = [
  '/',
  '/sesion',
  '/inspector',
  '/editor',
  '/cuerpos',
  '/punto/loc-fonetica45-01',
  '/biblioteca',
  '/estadisticas',
  '/horarios',
  '/datos',
  '/bienvenida',
];

/** Contraste WCAG entre dos colores `rgb(...)`. */
function contraste(c1, c2) {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(c1);
  const b = lum(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'es-ES' });
const page = await ctx.newPage();
const hallazgos = [];

await page.goto(`${BASE}/`);
await page.getByRole('link', { name: /Repasar ahora/ }).waitFor({ timeout: 90000 });

console.log('ruta                     | sin nombre | encabezados | sin etiqueta | aria rotos');
console.log('-------------------------|------------|-------------|--------------|-----------');

for (const ruta of RUTAS) {
  await page.goto(`${BASE}${ruta}`);
  await page.waitForTimeout(900);

  const r = await page.evaluate(() => {
    const texto = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

    /** El nombre accesible, en lo esencial: aria-label, texto o title. */
    const nombre = (el) => {
      const etiqueta = el.getAttribute('aria-label');
      if (etiqueta !== null && etiqueta.trim() !== '') return etiqueta.trim();
      const refs = el.getAttribute('aria-labelledby');
      if (refs) {
        const t = refs
          .split(/\s+/)
          .map((id) => texto(document.getElementById(id) ?? document.createElement('i')))
          .join(' ')
          .trim();
        if (t !== '') return t;
      }
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        if (el.id) {
          const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lab && texto(lab) !== '') return texto(lab);
        }
        const envoltorio = el.closest('label');
        if (envoltorio && texto(envoltorio) !== '') return texto(envoltorio);
        const ph = el.getAttribute('placeholder');
        if (ph && ph.trim() !== '') return ph.trim();
        return '';
      }
      if (texto(el) !== '') return texto(el);
      const t = el.getAttribute('title');
      return t && t.trim() !== '' ? t.trim() : '';
    };

    const visible = (el) => {
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    };

    // 1 · Interactivos sin nombre accesible.
    const sinNombre = [];
    const interactivos = document.querySelectorAll(
      'button, a[href], [role="button"], [role="tab"], [role="link"], summary',
    );
    for (const el of interactivos) {
      if (!visible(el)) continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (nombre(el) === '') {
        sinNombre.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 24)}`);
      }
    }

    // 2 · Controles de formulario sin etiqueta.
    const sinEtiqueta = [];
    for (const el of document.querySelectorAll('input, select, textarea')) {
      if (!visible(el)) continue;
      if (el.type === 'hidden') continue;
      if (nombre(el) === '') {
        sinEtiqueta.push(`${el.tagName.toLowerCase()}[${el.type ?? ''}]`);
      }
    }

    // 3 · Orden de encabezados: un solo h1 y sin saltos.
    const niveles = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(visible)
      .map((h) => Number(h.tagName[1]));
    const problemasEnc = [];
    const h1 = niveles.filter((n) => n === 1).length;
    if (h1 !== 1) problemasEnc.push(`${String(h1)} h1`);
    for (let i = 1; i < niveles.length; i += 1) {
      const salto = niveles[i] - niveles[i - 1];
      if (salto > 1) problemasEnc.push(`h${String(niveles[i - 1])}→h${String(niveles[i])}`);
    }

    // 4 · `aria-labelledby`/`aria-describedby` que apuntan a nada.
    const ariaRotos = [];
    for (const el of document.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
      for (const attr of ['aria-labelledby', 'aria-describedby']) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        for (const id of v.split(/\s+/)) {
          if (!document.getElementById(id)) ariaRotos.push(`${attr}="${id}"`);
        }
      }
    }

    // 5 · Landmarks y el idioma del documento.
    const landmarks = {
      main: document.querySelectorAll('main, [role="main"]').length,
      nav: document.querySelectorAll('nav, [role="navigation"]').length,
      lang: document.documentElement.getAttribute('lang') ?? '(sin lang)',
    };

    // 6 · Imágenes sin texto alternativo.
    const imgSinAlt = [...document.querySelectorAll('img')]
      .filter(visible)
      .filter((i) => i.getAttribute('alt') === null).length;

    return { sinNombre, sinEtiqueta, problemasEnc, ariaRotos, landmarks, imgSinAlt };
  });

  console.log(
    `${ruta.padEnd(24)} | ${String(r.sinNombre.length).padStart(10)} | ${String(
      r.problemasEnc.length,
    ).padStart(11)} | ${String(r.sinEtiqueta.length).padStart(12)} | ${String(
      r.ariaRotos.length,
    ).padStart(10)}`,
  );

  for (const x of r.sinNombre.slice(0, 4)) hallazgos.push(`${ruta}: interactivo sin nombre — ${x}`);
  for (const x of r.sinEtiqueta.slice(0, 4)) hallazgos.push(`${ruta}: control sin etiqueta — ${x}`);
  for (const x of r.problemasEnc) hallazgos.push(`${ruta}: encabezados — ${x}`);
  for (const x of r.ariaRotos.slice(0, 4)) hallazgos.push(`${ruta}: ${x} no apunta a nada`);
  if (r.landmarks.main === 0) hallazgos.push(`${ruta}: sin landmark <main>`);
  if (r.landmarks.lang !== 'es') hallazgos.push(`${ruta}: lang="${r.landmarks.lang}"`);
  if (r.imgSinAlt > 0) hallazgos.push(`${ruta}: ${String(r.imgSinAlt)} imágenes sin alt`);
}

// ---------------------------------------------- contraste de los tokens ----
console.log('\n--- contraste del texto sobre su fondo ---');
await page.goto(`${BASE}/`);
await page.waitForTimeout(600);
for (const tema of ['dark', 'light']) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-pc-theme', t);
  }, tema);
  await page.waitForTimeout(300);
  const pares = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      'texto/fondo': [v('--text'), v('--bg')],
      'texto-2/fondo': [v('--text-2'), v('--bg')],
      'texto-3/fondo': [v('--text-3'), v('--bg')],
      'texto/superficie': [v('--text'), v('--surface')],
      'acento/fondo': [v('--accent-text'), v('--bg')],
    };
  });
  const aRgb = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (m) return m[1].split(',').slice(0, 3).map((x) => Number(x.trim()));
    // Hex de 6 y de 3 dígitos: `#fff` se escapaba y dejaba un par sin medir,
    // que es la clase de punto ciego que hay que evitar en una auditoría.
    const h6 = /^#([0-9a-f]{6})$/i.exec(c.trim());
    if (h6) return [0, 2, 4].map((i) => parseInt(h6[1].slice(i, i + 2), 16));
    const h3 = /^#([0-9a-f]{3})$/i.exec(c.trim());
    if (h3) return [0, 1, 2].map((i) => parseInt(h3[1][i].repeat(2), 16));
    return null;
  };
  for (const [nombre, [a, b]] of Object.entries(pares)) {
    const ca = aRgb(a);
    const cb = aRgb(b);
    if (!ca || !cb) {
      console.log(`  ${tema} ${nombre.padEnd(18)} SIN MEDIR: ${a} / ${b}`);
      hallazgos.push(`contraste ${tema} ${nombre}: no se pudo medir (${a} / ${b})`);
      continue;
    }
    const ratio = contraste(ca, cb);
    const ok = ratio >= 4.5;
    console.log(`  ${tema} ${nombre.padEnd(18)} ${ratio.toFixed(2)}:1 ${ok ? '' : '  <<< bajo'}`);
    if (!ok) hallazgos.push(`contraste ${tema} ${nombre}: ${ratio.toFixed(2)}:1 (mínimo 4,5)`);
  }
}

// ----------------------------------------------------- teclado en sesión ---
console.log('\n--- la sesión con el teclado ---');
await page.goto(`${BASE}/sesion`);
await page.getByText(/1 \//).first().waitFor({ timeout: 30000 });
await page.keyboard.press('Space');
await page.keyboard.press('Space');
await page.waitForTimeout(500);
const teclado = await page.evaluate(() => ({
  califica: document.querySelectorAll('.grade').length,
  atajos: [...document.querySelectorAll('.grade')].map((b) => b.getAttribute('aria-keyshortcuts')),
  nombres: [...document.querySelectorAll('.grade')].map((b) => b.getAttribute('aria-label')),
}));
console.log('  botones de calificar  :', teclado.califica);
console.log('  atajos anunciados     :', teclado.atajos.join(', '));
console.log('  primer nombre         :', teclado.nombres[0]);
if (teclado.atajos.some((a) => a === null)) hallazgos.push('sesión: un calificador sin atajo anunciado');

console.log('\n================ HALLAZGOS ================');
if (hallazgos.length === 0) console.log('ninguno');
else hallazgos.forEach((h, i) => console.log(`${i + 1}. ${h}`));
await browser.close();
