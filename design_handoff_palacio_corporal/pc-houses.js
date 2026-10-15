// Generador de 10 casas amuebladas (≥100 puntos c/u) — Palace kind 'plan'
// Unidades: 1 u ≈ 5 cm. Ruta: recorrido en serpentina por habitaciones; dentro de cada habitación, sentido horario desde la puerta de entrada.
const F = 'fill="var(--surface)"', S = 'fill="var(--sunken)"', N = 'fill="none"', O = 'opacity="0.55"';
const r = (x, y, w, h, a = '', rx = 0) => `<rect x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${+w.toFixed(1)}" height="${+h.toFixed(1)}"${rx ? ` rx="${rx}"` : ''} ${a}/>`;
const c = (x, y, rr, a = '') => `<circle cx="${+x.toFixed(1)}" cy="${+y.toFixed(1)}" r="${rr}" ${a}/>`;
const e = (x, y, rx, ry, a = '') => `<ellipse cx="${+x.toFixed(1)}" cy="${+y.toFixed(1)}" rx="${rx}" ry="${ry}" ${a}/>`;
const p = (d, a = '') => `<path d="${d}" ${a}/>`;
const lines = (L, D, n, vert = true, a = O) => { let d = ''; for (let i = 1; i < n; i++) { const t = (vert ? L : D) * i / n; d += vert ? `M${t.toFixed(1)},1.5 V${(D - 1.5).toFixed(1)} ` : `M1.5,${t.toFixed(1)} H${(L - 1.5).toFixed(1)} `; } return p(d, N + ' ' + a); };
const chair = (x, y, rot = 0) => `<g transform="translate(${x},${y}) rotate(${rot})">${r(-5, -4, 10, 8, F, 2)}${p('M-5,-4 H5', N + ' stroke-width="1.6"')}</g>`;

// Biblioteca de muebles: [nombre, largo (a lo largo de la pared), fondo, dibujo(L, D)] — la pared está en y=0
const K = {
  bed: ['Cama', 46, 42, (L, D) => r(0, 0, L, 3, F, 1) + r(1, 2, L - 2, D - 2, F, 3) + r(1, D * .36, L - 2, D * .64 - 1, S, 3) + p(`M2,${D * .44} Q${L / 2},${D * .37} ${L - 2},${D * .46}`, N + ' ' + O) + r(4, 5, L / 2 - 6, D * .2, F, 3) + r(L / 2 + 2, 5, L / 2 - 6, D * .2, F, 3)],
  bedS: ['Cama individual', 26, 42, (L, D) => r(0, 0, L, 3, F, 1) + r(1, 2, L - 2, D - 2, F, 3) + r(1, D * .34, L - 2, D * .66 - 1, S, 3) + r(4, 5, L - 8, D * .18, F, 3)],
  bunk: ['Litera', 26, 42, (L, D) => r(0, 0, L, D, F, 2) + r(2, 2, L - 4, D - 4, S, 2) + p(`M${L - 4},4 V${D - 4} M${L - 7},4 V${D - 4} M${L - 7},10 H${L - 4} M${L - 7},18 H${L - 4} M${L - 7},26 H${L - 4} M${L - 7},34 H${L - 4}`, N) + r(4, 4, L - 14, 7, F, 2)],
  crib: ['Cuna', 22, 32, (L, D) => r(0, 0, L, D, F, 2) + lines(L, D, 7) + r(4, 4, L - 8, D - 8, S + ' ' + O, 2)],
  night: ['Mesilla', 14, 12, (L, D) => r(0, 0, L, D, F, 1.5) + c(L / 2, D / 2, 3.6, S) + c(L / 2, D / 2, 1.2, F)],
  wardrobe: ['Armario', 42, 14, (L, D) => r(0, 0, L, D, F, 1) + p(`M${L / 2},0 V${D}`, N) + lines(L, D * .7, 8)],
  dresser: ['Cómoda', 32, 12, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 3) + c(L / 6, D - 3, .9, 'fill="currentColor"') + c(L / 2, D - 3, .9, 'fill="currentColor"') + c(5 * L / 6, D - 3, .9, 'fill="currentColor"')],
  vanity: ['Tocador', 30, 13, (L, D) => r(0, 0, L, D, F, 1.5) + e(L / 2, 3, L * .3, 2.4, S) + chair(L / 2, D + 6, 180)],
  desk: ['Escritorio', 38, 26, (L, D) => r(0, 0, L, D * .55, F, 1.5) + r(L * .3, 1.5, L * .4, 2.6, 'fill="currentColor" opacity="0.7"') + r(L * .32, D * .3, L * .36, 4, S, 1) + c(L / 2, D * .82, 6, F) + p(`M${L / 2 - 6},${D * .95} Q${L / 2},${D + 1.5} ${L / 2 + 6},${D * .95}`, N + ' stroke-width="1.8"')],
  shelf: ['Estantería', 38, 9, (L, D) => r(0, 0, L, D, F, .6) + lines(L, D, 4) + p(Array.from({ length: Math.floor(L / 3) }, (_, i) => `M${2 + i * 3},2 V${D - 2 - (i % 3)}`).join(' '), N + ' opacity="0.35"')],
  sofa: ['Sofá', 56, 22, (L, D) => r(0, 0, L, D, F, 4) + r(0, 0, L, 6, S, 3) + r(0, 0, 6, D, F, 3) + r(L - 6, 0, 6, D, F, 3) + p(`M${L / 3},6 V${D - 2} M${2 * L / 3},6 V${D - 2}`, N + ' ' + O)],
  loveseat: ['Sofá de dos plazas', 38, 20, (L, D) => r(0, 0, L, D, F, 4) + r(0, 0, L, 6, S, 3) + r(0, 0, 6, D, F, 3) + r(L - 6, 0, 6, D, F, 3) + p(`M${L / 2},6 V${D - 2}`, N + ' ' + O)],
  armchair: ['Sillón', 22, 22, (L, D) => r(0, 0, L, D, F, 6) + r(3, 0, L - 6, 6, S, 3) + p(`M5,6 V${D - 3} M${L - 5},6 V${D - 3}`, N + ' ' + O)],
  beanbag: ['Puf', 20, 20, (L, D) => e(L / 2, D / 2, L / 2 - 1, D / 2 - 1, F) + e(L / 2, D / 2 + 2, L / 4, D / 5, S)],
  tv: ['Televisión', 40, 9, (L, D) => r(0, 0, L, D, F, 1.5) + r(L * .12, 2.6, L * .76, 2.4, 'fill="currentColor" opacity="0.8"')],
  piano: ['Piano', 36, 18, (L, D) => r(0, 0, L, D * .6, F, 1.5) + r(2, D * .45, L - 4, 4, S) + lines(L, 4, 12, true, 'opacity="0.4"').replace('<path', `<path transform="translate(0 ${D * .45})"`) + r(L * .3, D * .72, L * .4, 5, F, 1.5)],
  fireplace: ['Chimenea', 34, 11, (L, D) => r(0, 0, L, D, F, 1) + p(`M${L * .25},0 V${D * .55} Q${L / 2},${D * 1.05} ${L * .75},${D * .55} V0`, S) + p(`M${L * .4},${D * .35} Q${L / 2},${D * .1} ${L * .6},${D * .35}`, N + ' ' + O)],
  plant: ['Planta', 14, 14, (L, D) => c(L / 2, D / 2, 6.2, F) + c(L / 2 - 2.4, D / 2 - 1.5, 2.6, S) + c(L / 2 + 2.6, D / 2 - .5, 2.4, S) + c(L / 2, D / 2 + 2.6, 2.4, S)],
  lamp: ['Lámpara de pie', 12, 12, (L, D) => c(L / 2, D / 2, 5.4, F) + c(L / 2, D / 2, 2, S) + p(`M${L / 2 - 5.4},${D / 2} H${L / 2 + 5.4} M${L / 2},${D / 2 - 5.4} V${D / 2 + 5.4}`, N + ' opacity="0.3"')],
  cabinet: ['Aparador', 40, 12, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 4) + p(`M${L / 8},${D - 3} h2 M${3 * L / 8},${D - 3} h2 M${5 * L / 8},${D - 3} h2 M${7 * L / 8 - 2},${D - 3} h2`, N)],
  vitrina: ['Vitrina', 32, 12, (L, D) => r(0, 0, L, D, F, 1) + p(`M2,2 L${L / 2 - 1},${D - 2} M${L / 2 + 1},2 L${L - 2},${D - 2} M${L / 2},0 V${D}`, N + ' ' + O)],
  clock: ['Reloj de pie', 12, 9, (L, D) => r(0, 0, L, D, F, 1) + c(L / 2, D / 2, 3, S) + p(`M${L / 2},${D / 2} V${D / 2 - 2.4} M${L / 2},${D / 2} H${L / 2 + 1.8}`, N)],
  bar: ['Mueble bar', 30, 14, (L, D) => r(0, 0, L, D, F, 1.5) + c(6, D / 2, 2.4, S) + c(12, D / 2, 2.4, S) + c(18, D / 2, 2.4, S) + r(L - 9, 3, 6, D - 6, S, 1)],
  fridge: ['Nevera', 20, 18, (L, D) => r(0, 0, L, D, F, 1.5) + p(`M${L * .55},0 V${D} M2,${D - 2.5} H${L - 2}`, N + ' ' + O)],
  counter: ['Encimera', 32, 16, (L, D) => r(0, 0, L, D, F, 1) + p(`M0,${D - 2.5} H${L}`, N + ' ' + O) + r(L * .6, 3, L * .25, D * .45, S, 1)],
  stove: ['Fogones', 24, 16, (L, D) => r(0, 0, L, D, S, 1.5) + c(L * .28, D * .32, 3.2, N) + c(L * .72, D * .32, 3.2, N) + c(L * .28, D * .72, 3.2, N) + c(L * .72, D * .72, 3.2, N)],
  sink: ['Fregadero', 30, 16, (L, D) => r(0, 0, L, D, F, 1.5) + r(3, 3, L * .42, D - 6, S, 2.5) + r(L * .5, 3, L * .42, D - 6, S, 2.5) + c(L / 2, 2, 1.2, F)],
  dishwasher: ['Lavavajillas', 20, 16, (L, D) => r(0, 0, L, D, F, 1.5) + lines(L, D, 4, false)],
  oven: ['Horno', 22, 16, (L, D) => r(0, 0, L, D, F, 1.5) + r(3, 3, L - 6, D - 7, S, 1.5) + p(`M4,${D - 2} H${L - 4}`, N)],
  micro: ['Microondas', 18, 12, (L, D) => r(0, 0, L, D, F, 1.5) + r(2, 2, L * .62, D - 4, S, 1) + c(L - 3.5, D / 2, 1.2, N)],
  pantry: ['Despensa', 32, 14, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 4, false) + p(Array.from({ length: 6 }, (_, i) => `M${4 + i * 4.6},${D * .3} h2.6`).join(' '), N)],
  trash: ['Cubo de basura', 10, 10, (L, D) => c(L / 2, D / 2, 4.4, F) + c(L / 2, D / 2, 1.4, S)],
  island: ['Isla de cocina', 54, 24, (L, D) => r(0, 0, L, D, F, 2) + r(L * .35, 4, L * .3, D - 8, S, 2) + c(L * .2, D + 5, 4, F) + c(L * .5, D + 5, 4, F) + c(L * .8, D + 5, 4, F)],
  toilet: ['Inodoro', 15, 22, (L, D) => r(0, 0, L, 7, F, 2) + e(L / 2, D * .62, L / 2 - .5, D * .36, F) + e(L / 2, D * .64, L / 2 - 3, D * .24, S)],
  bidet: ['Bidé', 13, 18, (L, D) => e(L / 2, D / 2 + 1, L / 2 - .5, D / 2 - 1.5, F) + e(L / 2, D / 2 + 1, L / 2 - 3, D / 2 - 4, S)],
  basin: ['Lavabo', 24, 15, (L, D) => r(0, 0, L, D, F, 2) + e(L / 2, D / 2 + 1, L * .32, D * .3, S) + c(L / 2, 2.2, 1.1, F)],
  bathtub: ['Bañera', 48, 24, (L, D) => r(0, 0, L, D, F, 5) + r(3, 3, L - 6, D - 6, S, 8) + c(L - 9, D / 2, 1.4, F)],
  shower: ['Ducha', 30, 30, (L, D) => r(0, 0, L, D, S, 1) + p(`M0,${D} L${L},0`, N + ' opacity="0.35"') + c(L / 2, D / 2, 1.8, F) + p(`M${L},0 V${D}`, N + ' stroke-width="1.8" opacity="0.6"')],
  towel: ['Toallero', 22, 5, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 5)],
  bathcab: ['Mueble de baño', 28, 12, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 2)],
  washer: ['Lavadora', 20, 20, (L, D) => r(0, 0, L, D, F, 2) + c(L / 2, D / 2 + 1, 6.2, S) + c(L / 2, D / 2 + 1, 3.4, N) + p(`M3,3 h4`, N)],
  dryer: ['Secadora', 20, 20, (L, D) => r(0, 0, L, D, F, 2) + c(L / 2, D / 2 + 1, 6.2, S) + p(`M${L / 2 - 4},${D / 2 + 1} H${L / 2 + 4}`, N) + c(L - 4, 3.5, 1, F)],
  ironing: ['Tabla de planchar', 38, 11, (L, D) => p(`M0,1 H${L - 10} Q${L},${D / 2} ${L - 10},${D - 1} H0Z`, F) + r(L * .55, 3.5, 7, 4, S, 1.5)],
  basket: ['Cesto de ropa', 13, 13, (L, D) => c(L / 2, D / 2, 5.6, F) + p(`M${L / 2 - 4},${D / 2 - 2} H${L / 2 + 4} M${L / 2 - 5},${D / 2} H${L / 2 + 5} M${L / 2 - 4},${D / 2 + 2} H${L / 2 + 4}`, N + ' ' + O)],
  boiler: ['Caldera', 15, 10, (L, D) => r(0, 0, L, D, F, 1.5) + c(L / 2, D / 2, 2.6, S)],
  coat: ['Perchero', 12, 12, (L, D) => c(L / 2, D / 2, 5, F) + p(`M${L / 2},${D / 2 - 5} V${D / 2 + 5} M${L / 2 - 5},${D / 2} H${L / 2 + 5}`, N + ' ' + O) + c(L / 2, D / 2, 1.4, S)],
  shoes: ['Zapatero', 30, 10, (L, D) => r(0, 0, L, D, F, 1) + p(Array.from({ length: 4 }, (_, i) => `M${4 + i * 7},3 q2,4 4,0`).join(' '), N + ' ' + O)],
  mirror: ['Espejo', 28, 4, (L, D) => r(0, 0, L, D, S, 1) + p(`M3,1.2 L7,2.8 M9,1.2 L13,2.8`, N + ' opacity="0.4"')],
  console: ['Consola', 32, 10, (L, D) => r(0, 0, L, D, F, 1.5) + c(L * .25, D / 2, 2, S) + r(L * .55, 2.5, L * .3, D - 5, S, 1)],
  bench: ['Banco', 32, 12, (L, D) => r(0, 0, L, D, F, 2) + lines(L, D, 3)],
  umbrella: ['Paragüero', 10, 10, (L, D) => c(L / 2, D / 2, 4.2, F) + c(L / 2 - 1.4, D / 2 - 1, 1, S) + c(L / 2 + 1.4, D / 2 + .6, 1, S)],
  filing: ['Archivador', 16, 14, (L, D) => r(0, 0, L, D, F, 1) + lines(L, D, 3, false)],
  printer: ['Impresora', 18, 13, (L, D) => r(0, 0, L, D, F, 2) + r(3, D - 4, L - 6, 2.6, S, .6) + r(4, 2, L - 8, 3, S, .6)],
  board: ['Pizarra', 42, 4, (L, D) => r(0, 0, L, D, S, 1) + p(`M4,2 h6 M14,2 h10`, N + ' opacity="0.5"')],
  globe: ['Globo terráqueo', 14, 14, (L, D) => c(L / 2, D / 2, 5.8, F) + e(L / 2, D / 2, 2.4, 5.8, N + ' ' + O) + p(`M${L / 2 - 5.8},${D / 2} H${L / 2 + 5.8}`, N + ' ' + O)],
  treadmill: ['Cinta de correr', 22, 42, (L, D) => r(0, 0, L, D, F, 3) + r(3, 8, L - 6, D - 11, S, 2) + p(`M2,4 H${L - 2}`, N + ' stroke-width="1.6"')],
  bike: ['Bicicleta estática', 14, 30, (L, D) => e(L / 2, D * .2, 4, 5, F) + p(`M${L / 2},${D * .3} V${D * .78}`, N + ' stroke-width="1.6"') + e(L / 2, D * .82, 5, 3, F) + p(`M${L / 2 - 6},${D * .2} H${L / 2 + 6}`, N + ' stroke-width="1.4"')],
  weights: ['Mancuernas', 38, 12, (L, D) => r(0, 0, L, D, F, 1) + Array.from({ length: 5 }, (_, i) => c(5 + i * 7, D / 2, 2.6, S)).join('')],
  mat: ['Esterilla', 18, 40, (L, D) => r(0, 0, L, D, S, 2) + p(`M2,5 H${L - 2} M2,${D - 5} H${L - 2}`, N + ' ' + O)],
  bag: ['Saco de boxeo', 14, 14, (L, D) => c(L / 2, D / 2, 6, F) + c(L / 2, D / 2, 2.6, S)],
  car: ['Coche', 50, 92, (L, D) => r(2, 0, L - 4, D, F, 12) + r(6, D * .22, L - 12, D * .16, S, 4) + r(6, D * .62, L - 12, D * .12, S, 4) + r(-1, D * .18, 4, 8, F, 1) + r(L - 3, D * .18, 4, 8, F, 1)],
  workbench: ['Banco de trabajo', 46, 16, (L, D) => r(0, 0, L, D, F, 1) + r(4, 3, 10, 5, S, 1) + p(`M20,4 l8,6 M32,3 v8 M38,3 h5`, N)],
  rack: ['Estantes metálicos', 40, 12, (L, D) => r(0, 0, L, D, F, .5) + lines(L, D, 4) + lines(L, D, 2, false)],
  toolboard: ['Panel de herramientas', 40, 4, (L, D) => r(0, 0, L, D, S, .5) + p(`M5,1 v2 M10,1 v2 M16,1 h4 M25,1 v2 M31,1 h5`, N)],
  freezer: ['Congelador', 26, 18, (L, D) => r(0, 0, L, D, F, 2) + r(3, 3, L - 6, D - 6, S, 1.5)],
  bbq: ['Barbacoa', 18, 16, (L, D) => c(L / 2, D / 2, 7, F) + p(`M${L / 2 - 5},${D / 2 - 2.4} H${L / 2 + 5} M${L / 2 - 6},${D / 2} H${L / 2 + 6} M${L / 2 - 5},${D / 2 + 2.4} H${L / 2 + 5}`, N + ' ' + O)],
  sunbed: ['Tumbona', 18, 42, (L, D) => r(0, 0, L, D, F, 3) + r(2, 2, L - 4, D * .28, S, 2) + lines(L, D, 6, false, 'opacity="0.3"')],
  hammock: ['Hamaca', 46, 16, (L, D) => p(`M2,${D / 2} Q${L / 2},${D * .1} ${L - 2},${D / 2} Q${L / 2},${D * .95} 2,${D / 2}Z`, F) + c(2, D / 2, 1.6, S) + c(L - 2, D / 2, 1.6, S)],
  fountain: ['Fuente', 20, 20, (L, D) => c(L / 2, D / 2, 8.4, F) + c(L / 2, D / 2, 5.6, S) + c(L / 2, D / 2, 1.6, F)],
  drums: ['Batería', 32, 26, (L, D) => c(L * .3, D * .35, 5, F) + c(L * .7, D * .35, 5, F) + c(L / 2, D * .7, 7, S) + c(L * .12, D * .75, 3.6, F) + c(L * .88, D * .75, 3.6, F)],
  guitar: ['Guitarra', 12, 26, (L, D) => p(`M${L / 2},1 V${D * .45}`, N + ' stroke-width="1.6"') + e(L / 2, D * .62, 4.6, 4.2, F) + e(L / 2, D * .84, 5.6, 4.4, F) + c(L / 2, D * .7, 1.4, S)],
  speaker: ['Altavoz', 12, 10, (L, D) => r(0, 0, L, D, F, 1.5) + c(L / 2, D / 2, 3, S)],
  record: ['Tocadiscos', 24, 14, (L, D) => r(0, 0, L, D, F, 1.5) + c(L * .4, D / 2, 5, S) + c(L * .4, D / 2, 1, F) + p(`M${L - 4},3 L${L * .55},${D / 2}`, N)],
  pool: ['Mesa de billar', 72, 40, (L, D) => r(0, 0, L, D, F, 3) + r(4, 4, L - 8, D - 8, S, 1) + [[4, 4], [L / 2, 3.5], [L - 4, 4], [4, D - 4], [L / 2, D - 3.5], [L - 4, D - 4]].map(([x, y]) => c(x, y, 1.8, 'fill="currentColor"')).join('')],
  arcade: ['Máquina recreativa', 18, 16, (L, D) => r(0, 0, L, D, F, 2) + r(3, 2, L - 6, D * .45, 'fill="currentColor" opacity="0.6"', 1) + c(L * .35, D * .75, 1.6, S) + c(L * .65, D * .75, 1.6, S)],
  dart: ['Diana', 14, 4, (L, D) => c(L / 2, D / 2 + 2, 5.6, F) + c(L / 2, D / 2 + 2, 2.6, S)],
  toybox: ['Baúl de juguetes', 24, 14, (L, D) => r(0, 0, L, D, F, 2) + p(`M2,${D * .35} H${L - 2}`, N) + c(L / 2, D * .35, 1.4, S)],
  easel: ['Caballete', 18, 14, (L, D) => p(`M${L / 2},1 L2,${D - 1} M${L / 2},1 L${L - 2},${D - 1} M${L / 2},1 V${D - 1}`, N + ' stroke-width="1.4"') + r(3, D * .3, L - 6, 3, F)],
  reading: ['Sillón de lectura', 22, 24, (L, D) => r(0, 0, L, D, F, 7) + r(3, 0, L - 6, 7, S, 3) + c(L + 5, D - 4, 3.4, F)],
  // ítems centrales (sin pared)
  tableR: ['Mesa de comedor', 64, 36, (L, D) => r(0, 0, L, D, F, 2) + chair(L * .2, -6) + chair(L * .5, -6) + chair(L * .8, -6) + chair(L * .2, D + 6, 180) + chair(L * .5, D + 6, 180) + chair(L * .8, D + 6, 180) + r(L * .3, D * .3, L * .4, D * .4, S + ' ' + O, 2)],
  tableO: ['Mesa redonda', 40, 40, (L, D) => c(L / 2, D / 2, L / 2 - 2, F) + chair(L / 2, -5) + chair(L / 2, D + 5, 180) + chair(-5, D / 2, -90) + chair(L + 5, D / 2, 90) + c(L / 2, D / 2, 4, S)],
  coffee: ['Mesa de centro', 38, 20, (L, D) => r(0, 0, L, D, F, 3) + r(L * .6, D * .25, L * .25, D * .5, S, 2)],
  rug: [null, 60, 40, (L, D) => r(0, 0, L, D, 'fill="currentColor" opacity="0.07" stroke="none"', 3)],
};
const ROOM = {
  recibidor: ['Recibidor', 'dia', ['coat', 'shoes', 'mirror', 'console', 'plant', 'bench', 'umbrella', 'lamp', 'clock'], []],
  salon: ['Salón', 'dia', ['sofa', 'lamp', 'shelf', 'plant', 'tv', 'fireplace', 'armchair', 'vitrina', 'loveseat'], ['rug', 'coffee']],
  comedor: ['Comedor', 'dia', ['cabinet', 'clock', 'plant', 'vitrina', 'bar', 'lamp'], ['tableR']],
  cocina: ['Cocina', 'serv', ['fridge', 'counter', 'stove', 'oven', 'sink', 'dishwasher', 'micro', 'pantry', 'trash'], ['island']],
  cocinaS: ['Cocina', 'serv', ['fridge', 'stove', 'sink', 'counter', 'micro', 'trash', 'pantry'], ['tableO']],
  lavadero: ['Lavadero', 'serv', ['washer', 'dryer', 'basket', 'ironing', 'boiler', 'rack', 'sink'], []],
  despensa: ['Despensa', 'serv', ['pantry', 'rack', 'freezer', 'pantry', 'trash', 'shelf'], []],
  principal: ['Dormitorio principal', 'noche', ['night', 'bed', 'night', 'lamp', 'wardrobe', 'dresser', 'mirror', 'armchair', 'plant', 'vanity'], ['rug']],
  dormitorio: ['Dormitorio', 'noche', ['night', 'bed', 'night', 'wardrobe', 'desk', 'shelf', 'mirror', 'plant'], ['rug']],
  infantil: ['Habitación infantil', 'noche', ['bunk', 'toybox', 'shelf', 'desk', 'wardrobe', 'easel', 'beanbag', 'lamp'], ['rug']],
  bebe: ['Cuarto del bebé', 'noche', ['crib', 'dresser', 'armchair', 'toybox', 'lamp', 'wardrobe', 'plant'], []],
  invitados: ['Cuarto de invitados', 'noche', ['night', 'bed', 'wardrobe', 'armchair', 'mirror', 'plant', 'dresser'], ['rug']],
  vestidor: ['Vestidor', 'noche', ['wardrobe', 'shoes', 'mirror', 'dresser', 'wardrobe', 'bench'], []],
  bano: ['Baño', 'noche', ['basin', 'toilet', 'bidet', 'bathtub', 'towel', 'bathcab', 'mirror'], []],
  aseo: ['Aseo', 'noche', ['basin', 'toilet', 'towel', 'mirror', 'shower'], []],
  estudio: ['Estudio', 'ocio', ['desk', 'shelf', 'filing', 'printer', 'board', 'reading', 'plant', 'lamp', 'shelf'], ['rug']],
  biblioteca: ['Biblioteca', 'ocio', ['shelf', 'shelf', 'shelf', 'reading', 'lamp', 'globe', 'shelf', 'clock'], ['rug']],
  gimnasio: ['Gimnasio', 'ocio', ['treadmill', 'bike', 'weights', 'mirror', 'mat', 'bag', 'bench'], []],
  musica: ['Sala de música', 'ocio', ['piano', 'guitar', 'speaker', 'record', 'drums', 'speaker', 'shelf', 'armchair'], []],
  juegos: ['Sala de juegos', 'ocio', ['arcade', 'dart', 'bar', 'sofa', 'tv', 'arcade', 'speaker'], ['pool']],
  atelier: ['Taller de arte', 'ocio', ['easel', 'counter', 'shelf', 'easel', 'sink', 'rack', 'plant'], []],
  garaje: ['Garaje', 'ext', ['workbench', 'toolboard', 'rack', 'freezer', 'bike', 'trash'], ['car']],
  terraza: ['Terraza', 'ext', ['plant', 'bbq', 'sunbed', 'sunbed', 'plant', 'hammock', 'lamp'], ['tableO']],
  jardin: ['Jardín', 'ext', ['plant', 'fountain', 'bench', 'plant', 'hammock', 'bbq', 'plant', 'sunbed'], []],
  porche: ['Porche', 'ext', ['bench', 'plant', 'armchair', 'lamp', 'plant', 'umbrella'], ['coffee']],
};
const EXTRA = { dia: ['plant', 'speaker', 'lamp'], serv: ['trash', 'basket', 'plant'], noche: ['plant', 'basket', 'lamp'], ocio: ['plant', 'speaker', 'lamp'], ext: ['plant', 'lamp', 'plant'] };
const ZC = { dia: 'cabeza', serv: 'torso', noche: 'hombros', ocio: 'brazos', ext: 'piernas' };
const ZN = { dia: 'Zona de día', serv: 'Cocina y servicio', noche: 'Zona de noche', ocio: 'Trabajo y ocio', ext: 'Exterior' };
const FLOOR = { dia: 'wood', noche: 'wood', ocio: 'wood', serv: 'tile', ext: 'deck' };
const ITEMS = ['however', 'moreover', 'therefore', 'whereas', 'nonetheless', 'thus', 'meanwhile', 'consequently', 'furthermore', 'otherwise'];
const STATES = ['review', 'learning', 'new', 'review', 'mastered', 'new', 'due', 'review', 'empty', 'new', 'learning'];

function build(def, hi) {
  const rows = def.rows; const W = def.w; let y = 0; const rooms = [];
  rows.forEach((row, ri) => { let x = 0; const tot = row.r.reduce((a, q) => a + q[1], 0); row.r.forEach(([t, w]) => { const ww = w * W / tot; rooms.push({ t, x, y, w: ww, h: row.h, row: ri }); x += ww; }); y += row.h; });
  const H = y;
  // orden de ruta: serpentina por filas
  const order = []; rows.forEach((row, ri) => { const rs = rooms.filter(q => q.row === ri); order.push(...(ri % 2 ? rs.reverse() : rs)); });
  // puertas entre habitaciones consecutivas
  const doors = []; const DW = 22;
  const shared = (a, b) => {
    if (Math.abs(a.x + a.w - b.x) < .5 || Math.abs(b.x + b.w - a.x) < .5) { const X = Math.abs(a.x + a.w - b.x) < .5 ? b.x : a.x; const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h); if (y1 - y0 > DW + 8) return { v: true, X, a0: (y0 + y1) / 2 - DW / 2, into: b.x >= X - .5 ? 1 : -1 }; }
    if (Math.abs(a.y + a.h - b.y) < .5 || Math.abs(b.y + b.h - a.y) < .5) { const Y = Math.abs(a.y + a.h - b.y) < .5 ? b.y : a.y; const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w); if (x1 - x0 > DW + 8) { const mid = b.row % 2 ? x1 - DW - 12 : x0 + 12; return { v: false, Y, a0: Math.max(x0 + 8, Math.min(x1 - DW - 8, mid)), into: b.y >= Y - .5 ? 1 : -1 }; } }
    return null;
  };
  order.forEach((q, i) => { q.doors = q.doors || []; });
  const entry = { v: true, X: 0, a0: order[0].y + order[0].h / 2 - DW / 2, into: 1, ext: true };
  doors.push(entry); order[0].doors.push(entry); order[0].entry = entry;
  for (let i = 1; i < order.length; i++) { const d = shared(order[i - 1], order[i]); if (d) { doors.push(d); order[i - 1].doors.push(d); order[i].doors.push(d); order[i].entry = d; } }
  // muebles por perímetro (horario) desde la puerta de entrada
  let svgF = '', loci = [], n = 0; const used = {};
  const toLocal = (q, d) => { // pared y desplazamiento en sentido horario
    const x1 = q.x + q.w, y1 = q.y + q.h;
    if (d.v) { if (Math.abs(d.X - q.x) < .5) return { w: 3, a: y1 - d.a0 - DW, b: y1 - d.a0 }; if (Math.abs(d.X - x1) < .5) return { w: 1, a: d.a0 - q.y, b: d.a0 - q.y + DW }; }
    else { if (Math.abs(d.Y - q.y) < .5) return { w: 0, a: d.a0 - q.x, b: d.a0 - q.x + DW }; if (Math.abs(d.Y - y1) < .5) return { w: 2, a: x1 - d.a0 - DW, b: x1 - d.a0 }; }
    return null;
  };
  const place = (q, wall, off, L, D) => { const x1 = q.x + q.w, y1 = q.y + q.h, I = 3;
    if (wall === 0) return { tf: `translate(${q.x + off},${q.y + I})`, cx: q.x + off + L / 2, cy: q.y + I + D / 2 };
    if (wall === 1) return { tf: `translate(${x1 - I},${q.y + off}) rotate(90)`, cx: x1 - I - D / 2, cy: q.y + off + L / 2 };
    if (wall === 2) return { tf: `translate(${x1 - off},${y1 - I}) rotate(180)`, cx: x1 - off - L / 2, cy: y1 - I - D / 2 };
    return { tf: `translate(${q.x + I},${y1 - off}) rotate(270)`, cx: q.x + I + D / 2, cy: y1 - off - L / 2 };
  };
  const labels = [];
  order.forEach((q, ri) => {
    const [label, zk, list, center] = ROOM[q.t]; q.label = label; q.zk = zk;
    const lens = [q.w, q.h, q.w, q.h];
    const gaps = [[], [], [], []]; q.doors.forEach(d => { const l = toLocal(q, d); if (l) gaps[l.w].push([l.a - 4, l.b + 4]); });
    const st = q.entry ? toLocal(q, q.entry) : { w: 0, a: 0, b: 0 };
    const segs = [[st.w, st.b + 4, lens[st.w]], [(st.w + 1) % 4, 0, lens[(st.w + 1) % 4]], [(st.w + 2) % 4, 0, lens[(st.w + 2) % 4]], [(st.w + 3) % 4, 0, lens[(st.w + 3) % 4]], [st.w, 0, st.a - 4]];
    let si = 0, cur = segs[0][1], prevDepth = 0, wallDepth = 0; const queue = [...list, ...EXTRA[zk]];
    let guard = 0; const m = 5;
    while (queue.length && si < segs.length && guard++ < 200) {
      const [wall, s0, s1] = segs[si]; const k = queue[0]; const [nm, L, D, draw] = K[k];
      let a = Math.max(cur, s0); const g = gaps[wall].find(([ga, gb]) => a < gb && a + L > ga); if (g) { cur = g[1]; continue; }
      if (a + L > s1 - (si < 4 ? 0 : 0) || L > lens[wall] - 8) { si++; prevDepth = wallDepth; wallDepth = 0; cur = si < segs.length ? Math.max(segs[si][1], prevDepth + 3) : 0; continue; }
      if (D > (wall % 2 ? q.w : q.h) * .42) { queue.shift(); continue; }
      const pl = place(q, wall, a, L, D); svgF += `<g transform="${pl.tf}">${draw(L, D)}</g>`;
      if (nm) { n++; const nameKey = nm; used[nameKey] = (used[nameKey] || 0) + 1; loci.push({ n, nm, room: label, zone: ZC[zk], x: pl.cx / W, y: pl.cy / H }); }
      wallDepth = Math.max(wallDepth, D); cur = a + L + m; queue.shift();
    }
    // centrales
    const cx = q.x + q.w / 2, cy = q.y + q.h / 2 + 6;
    center.forEach((k, i) => { const [nm, L0, D0, draw] = K[k]; const s = Math.min(1, (q.w - 70) / L0, (q.h - 70) / D0); if (s < .55) return; const L = L0 * s, D = D0 * s;
      svgF = (nm ? svgF : `<g transform="translate(${cx - L / 2},${cy - D / 2})">${draw(L, D)}</g>` + svgF); if (!nm) return;
      svgF += `<g transform="translate(${cx - L / 2},${cy - D / 2})">${draw(L, D)}</g>`; n++; used[nm] = (used[nm] || 0) + 1; loci.push({ n, nm, room: label, zone: ZC[zk], x: cx / W, y: cy / H }); });
    labels.push({ plan: 'gen', sub: `${(q.w * .05).toFixed(1).replace('.', ',')} × ${(q.h * .05).toFixed(1).replace('.', ',')} m`, label, x: q.x, y: q.y, w: q.w, h: q.h, zone: ZC[zk], lx: q.x + q.w / 2 - label.length * 3.6, ly: q.y + Math.min(46, q.h * .36) });
  });
  // puerta principal como punto 0 → renumerar
  loci.unshift({ n: 0, nm: 'Puerta principal', room: order[0].label, zone: ZC[order[0].zk], x: 6 / W, y: (entry.a0 + DW / 2) / H });
  loci = loci.map((l, i) => ({ id: `${def.id}-${i + 1}`, n: i + 1, name: used[l.nm] > 1 ? `${l.nm} · ${l.room}` : l.nm, room: l.room, zone: l.zone, x: +l.x.toFixed(4), y: +l.y.toFixed(4), side: 'front', state: i < 10 ? STATES[(i * 7 + hi) % STATES.length] : 'empty', item: i < 10 ? ITEMS[i % ITEMS.length] : '' }));
  // suelos
  let floors = '', walls = '', win = '';
  order.forEach(q => { const f = FLOOR[q.zk]; floors += `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="color-mix(in srgb, var(--zone-${ZC[q.zk]}) 9%, transparent)" stroke="none"/><rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="url(#pcg-${q.t === 'garaje' ? 'conc' : q.t === 'bano' || q.t === 'aseo' ? 'tile' : f})" stroke="none"/>`; });
  // muros con huecos de puertas
  const segs2 = { ext: '', int: '' }; const seg = (x0, y0, x1, y1, ext) => { segs2[ext ? 'ext' : 'int'] += `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} `; return ''; };
  order.forEach(q => { const x1 = q.x + q.w, y1 = q.y + q.h;
    const edges = [[q.x, q.y, x1, q.y, false], [x1, q.y, x1, y1, true], [q.x, y1, x1, y1, false], [q.x, q.y, q.x, y1, true]];
    edges.forEach(([ax, ay, bx, by, vert]) => { const ext = vert ? (ax < .5 || ax > W - .5) : (ay < .5 || ay > H - .5);
      const gs = doors.filter(d => d.v === vert && (vert ? Math.abs(d.X - ax) < .5 : Math.abs(d.Y - ay) < .5)).map(d => [d.a0, d.a0 + DW]).filter(([a, b]) => vert ? a >= ay - .5 && b <= by + .5 : a >= ax - .5 && b <= bx + .5).sort((u, v) => u[0] - v[0]);
      let s = vert ? ay : ax; const end = vert ? by : bx;
      gs.forEach(([a, b]) => { if (a > s) walls += vert ? seg(ax, s, ax, a, ext) : seg(s, ay, a, ay, ext); s = b; });
      if (end > s) walls += vert ? seg(ax, s, ax, end, ext) : seg(s, ay, end, ay, ext);
      if (ext && !gs.length && (vert ? by - ay : bx - ax) > 70) { const mid = vert ? (ay + by) / 2 : (ax + bx) / 2, wl = 30; win += vert ? `<rect x="${ax - 3.7}" y="${mid - wl / 2}" width="7.4" height="${wl}"/><path d="M${ax - 1},${mid - wl / 2} V${mid + wl / 2} M${ax + 1},${mid - wl / 2} V${mid + wl / 2}" fill="none" stroke-width="0.5"/>` : `<rect x="${mid - wl / 2}" y="${ay - 3.7}" width="${wl}" height="7.4"/><path d="M${mid - wl / 2},${ay - 1} H${mid + wl / 2} M${mid - wl / 2},${ay + 1} H${mid + wl / 2}" fill="none" stroke-width="0.5"/>`; }
    });
  });
  let leaves = ''; const arcs = doors.map(d => { const g = DW, s = d.into; if (d.v) { const X = d.X, a = d.a0, b = a + g; leaves += `<rect x="${s > 0 ? X : X - g}" y="${a - 1}" width="${g}" height="2" rx="0.6"/>`; return `M${X + s * g},${a} A${g},${g} 0 0,${s > 0 ? 1 : 0} ${X},${b}`; } const Y = d.Y, a = d.a0, b = a + g; leaves += `<rect x="${a - 1}" y="${s > 0 ? Y : Y - g}" width="2" height="${g}" rx="0.6"/>`; return `M${a},${Y + s * g} A${g},${g} 0 0,${s > 0 ? 0 : 1} ${b},${Y}`; }).join(' ');
  const defs = `<defs><pattern id="pcg-wood" width="48" height="16" patternUnits="userSpaceOnUse"><path d="M0,8 H48 M0,16 H48 M16,0 V8 M40,8 V16" stroke="currentColor" stroke-opacity="0.13" stroke-width="0.5" fill="none"/></pattern><pattern id="pcg-tile" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12,0 H0 V12" stroke="currentColor" stroke-opacity="0.15" stroke-width="0.5" fill="none"/></pattern><pattern id="pcg-deck" width="48" height="7" patternUnits="userSpaceOnUse"><path d="M0,7 H48" stroke="currentColor" stroke-opacity="0.17" stroke-width="0.6" fill="none"/></pattern><filter id="pcg-sh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="1.1" dy="1.6" stdDeviation="1.1" flood-color="oklch(0.08 0.02 270)" flood-opacity="0.45"/></filter><pattern id="pcg-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 V4" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.7"/></pattern><pattern id="pcg-conc" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="0.6" fill="currentColor" fill-opacity="0.2"/><circle cx="10" cy="10" r="0.5" fill="currentColor" fill-opacity="0.2"/></pattern></defs>`;
  const svg = defs + floors + `<g stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#pcg-sh)">${svgF}</g>` + `<g stroke-linecap="square" fill="none"><path d="${segs2.ext}" stroke="currentColor" stroke-width="7.4"/><path d="${segs2.int}" stroke="currentColor" stroke-width="4.6"/><path d="${segs2.ext}" stroke="var(--sunken)" stroke-width="5.6"/><path d="${segs2.int}" stroke="var(--sunken)" stroke-width="2.8"/><path d="${segs2.ext}" stroke="url(#pcg-hatch)" stroke-width="5.6"/></g><path d="${arcs}" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2 2" opacity="0.6"/><g fill="var(--surface)" stroke="currentColor" stroke-width="0.7">${leaves}</g><g fill="var(--surface)" stroke="currentColor" stroke-width="0.7">${win}</g>`;
  const zkeys = [...new Set(order.map(q => q.zk))];
  const zones = zkeys.map(k => ({ id: ZC[k], name: `${ZN[k]} · ${order.filter(q => q.zk === k).map(q => q.label).join(', ')}` }));
  return { id: def.id, name: def.name, short: def.short, template: 'Plano de casa', kind: 'plan', aspect: W / H, planData: { svg, w: W, h: H }, rooms: labels, loci, zones, style: { accent: def.accent, line: 'fine' }, roomCount: order.length };
}

const DEFS = [
  { id: 'h1', name: 'Casa familiar', short: 'Familiar', accent: 'brazos', w: 720, rows: [{ h: 150, r: [['recibidor', 110], ['salon', 220], ['comedor', 170], ['cocina', 180]] }, { h: 140, r: [['infantil', 170], ['bano', 120], ['principal', 230], ['lavadero', 160]] }, { h: 140, r: [['estudio', 190], ['gimnasio', 160], ['garaje', 170], ['terraza', 200]] }] },
  { id: 'h2', name: 'Piso urbano', short: 'Piso', accent: 'cabeza', w: 640, rows: [{ h: 130, r: [['recibidor', 100], ['salon', 220], ['cocina', 170], ['lavadero', 120]] }, { h: 130, r: [['estudio', 170], ['aseo', 90], ['dormitorio', 180], ['comedor', 160]] }, { h: 130, r: [['principal', 220], ['bano', 120], ['vestidor', 110], ['terraza', 160]] }] },
  { id: 'h3', name: 'Casa de campo', short: 'Campo', accent: 'piernas', w: 760, rows: [{ h: 150, r: [['porche', 160], ['recibidor', 110], ['salon', 240], ['cocina', 200]] }, { h: 140, r: [['jardin', 220], ['comedor', 190], ['despensa', 110], ['lavadero', 160]] }, { h: 140, r: [['principal', 230], ['bano', 120], ['invitados', 190], ['atelier', 190]] }] },
  { id: 'h4', name: 'Ático con terraza', short: 'Ático', accent: 'hombros', w: 700, rows: [{ h: 140, r: [['recibidor', 110], ['salon', 250], ['comedor', 170], ['cocina', 170]] }, { h: 130, r: [['musica', 190], ['aseo', 90], ['estudio', 170], ['lavadero', 130]] }, { h: 160, r: [['principal', 220], ['bano', 130], ['vestidor', 110], ['terraza', 240]] }] },
  { id: 'h5', name: 'Villa mediterránea', short: 'Villa', accent: 'torso', w: 800, rows: [{ h: 150, r: [['porche', 150], ['recibidor', 110], ['salon', 260], ['comedor', 190]] }, { h: 140, r: [['juegos', 230], ['bar' in ROOM ? 'juegos' : 'despensa', 0.0001], ['cocina', 200], ['lavadero', 150], ['despensa', 110]] }, { h: 150, r: [['principal', 230], ['bano', 130], ['invitados', 190], ['jardin', 250]] }] },
  { id: 'h6', name: 'Casa de la abuela', short: 'Abuela', accent: 'brazos', w: 680, rows: [{ h: 140, r: [['recibidor', 110], ['salon', 220], ['comedor', 180], ['cocinaS', 170]] }, { h: 140, r: [['biblioteca', 190], ['bano', 120], ['principal', 220], ['despensa', 150]] }, { h: 130, r: [['jardin', 220], ['invitados', 180], ['lavadero', 140], ['porche', 140]] }] },
  { id: 'h7', name: 'Loft industrial', short: 'Loft', accent: 'cabeza', w: 720, rows: [{ h: 150, r: [['recibidor', 100], ['salon', 260], ['cocina', 200], ['comedor', 160]] }, { h: 140, r: [['atelier', 210], ['musica', 180], ['gimnasio', 170], ['aseo', 100]] }, { h: 140, r: [['principal', 240], ['bano', 130], ['estudio', 190], ['terraza', 160]] }] },
  { id: 'h8', name: 'Cabaña de montaña', short: 'Cabaña', accent: 'piernas', w: 660, rows: [{ h: 140, r: [['porche', 140], ['recibidor', 100], ['salon', 240], ['cocinaS', 180]] }, { h: 130, r: [['biblioteca', 180], ['bano', 120], ['dormitorio', 180], ['despensa', 120]] }, { h: 140, r: [['principal', 220], ['infantil', 180], ['garaje', 170], ['jardin', 150]] }] },
  { id: 'h9', name: 'Casa de playa', short: 'Playa', accent: 'hombros', w: 740, rows: [{ h: 140, r: [['terraza', 190], ['recibidor', 100], ['salon', 250], ['cocina', 200]] }, { h: 140, r: [['juegos', 240], ['aseo', 90], ['comedor', 190], ['lavadero', 150]] }, { h: 140, r: [['principal', 230], ['bano', 120], ['invitados', 190], ['jardin', 200]] }] },
  { id: 'h10', name: 'Mansión victoriana', short: 'Mansión', accent: 'torso', w: 840, rows: [{ h: 150, r: [['porche', 140], ['recibidor', 120], ['salon', 250], ['comedor', 200], ['cocina', 190]] }, { h: 140, r: [['musica', 200], ['biblioteca', 220], ['estudio', 190], ['despensa', 110], ['lavadero', 140]] }, { h: 150, r: [['principal', 240], ['vestidor', 110], ['bano', 130], ['invitados', 190], ['jardin', 200]] }] },
];
DEFS[4].rows[1].r = [['juegos', 240], ['cocina', 210], ['lavadero', 150], ['despensa', 120]];
export const HOUSES = DEFS.map((d, i) => { const h = build(d, i); h.name = `${d.name} · ${h.loci.length} puntos`; return h; });
