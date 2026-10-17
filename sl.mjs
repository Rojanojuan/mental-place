import { devices, webkit } from '@playwright/test';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES' });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('link', { name: /Repasar ahora/ }).waitFor({ timeout: 90000 });
await page.goto('http://127.0.0.1:4173/inspector');
await page.getByText(/45 puntos/).waitFor({ timeout: 40000 });
await page.waitForTimeout(1000);
const n = await page.locator('.lupa__map [role="button"]').count();
console.log('pines en la lupa:', n);
// Medir el area tactil real de los pines dentro de la lupa.
const hits = await page.evaluate(() => {
  const out = [];
  for (const g of document.querySelectorAll('.lupa__map .pin')) {
    const c = g.querySelector('.pin__hit') ?? g;
    const r = c.getBoundingClientRect();
    out.push(Math.round(Math.min(r.width, r.height)));
  }
  return out;
});
console.log('areas tactiles (px):', hits.length ? `min ${Math.min(...hits)} max ${Math.max(...hits)} n=${hits.length}` : 'ninguna');
const info = await page.evaluate(() => {
  const c = document.querySelector('.lupa__circle');
  const svg = document.querySelector('.lupa__map');
  const dot = document.querySelector('.lupa__map .pin__dot');
  const num = document.querySelectorAll('.lupa__map text').length;
  const rc = c?.getBoundingClientRect();
  const rs = svg?.getBoundingClientRect();
  const rd = dot?.getBoundingClientRect();
  return {
    circulo: rc ? Math.round(rc.width) : 0,
    svg: rs ? Math.round(rs.width) : 0,
    viewBox: svg?.getAttribute('viewBox'),
    puntoVisible: rd ? Math.round(rd.width) : 0,
    numeros: num,
  };
});
console.log(JSON.stringify(info));
await page.evaluate(() => document.querySelector('.lupa')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(400);
await page.screenshot({ path: 'lupa.png' });
await browser.close();
