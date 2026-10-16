import { chromium, devices } from '@playwright/test';
const ROUTES = [
  '/',
  '/inspector',
  '/editor',
  '/cuerpos',
  '/biblioteca',
  '/estadisticas',
  '/horarios',
  '/datos',
  '/bienvenida',
  '/sesion',
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 5'], locale: 'es-ES' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('link', { name: /Repasar ahora/ }).waitFor({ timeout: 40000 });

let totalBad = 0;
console.log('ruta            | desborda | objetivos | <44 real | <28 real');
console.log('----------------|----------|-----------|----------|---------');
for (const route of ROUTES) {
  await page.goto(`http://127.0.0.1:4173${route}`);
  await page.waitForTimeout(1300);
  const m = await page.evaluate(() => {
    const d = document.documentElement;
    const els = [...document.querySelectorAll('button,a,input,select,textarea,[role=button]')];
    const sizes = els
      .map((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        // El objetivo real puede ser la etiqueta que lo envuelve.
        const label = el.closest('label');
        const box = label && label.contains(el) ? label.getBoundingClientRect() : r;
        const isPin = el.classList?.contains?.('pin') || el.closest?.('.pin');
        return { min: Math.min(box.width, box.height), isPin: Boolean(isPin) };
      })
      .filter(Boolean);
    return {
      overflow: d.scrollWidth > d.clientWidth,
      total: sizes.length,
      bad44: sizes.filter((s) => s.min < 44 && !s.isPin).length,
      bad28: sizes.filter((s) => s.min < 28).length,
    };
  });
  totalBad += m.bad44 + m.bad28;
  console.log(
    `${route.padEnd(15)} | ${(m.overflow ? 'SÍ ⚠' : 'no').padEnd(8)} | ${String(m.total).padEnd(9)} | ${String(m.bad44).padEnd(8)} | ${m.bad28}`,
  );
}
console.log('\nerrores JS:', errs.length ? errs : 'ninguno');
console.log(
  totalBad === 0
    ? '\nAUDITORÍA: sin objetivos por debajo del mínimo.'
    : `\nAUDITORÍA: ${totalBad} por revisar.`,
);
await browser.close();
