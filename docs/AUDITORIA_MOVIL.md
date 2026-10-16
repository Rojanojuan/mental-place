# Auditoría de uso en móvil

> Medida en Chromium real con emulación de Pixel 5 (393 × 727), contra el build de producción.
> Se repite con `npm run e2e` (proyecto `movil`).

## Resultado

| Ruta                     | Desborda | Objetivos táctiles | Bajo 44 px | Bajo 28 px |
| ------------------------ | -------- | ------------------ | ---------- | ---------- |
| `/` Hoy                  | no       | 14                 | 0          | 0          |
| `/inspector` Palacio     | no       | 110                | 0          | 0          |
| `/editor` Editor         | no       | 148                | 0          | 0          |
| `/cuerpos` Mis cuerpos   | no       | 32                 | 0          | 0          |
| `/biblioteca` Biblioteca | no       | 58                 | 0          | 0          |
| `/estadisticas` Progreso | no       | 10                 | 0          | 0          |
| `/horarios` Horarios     | no       | 52                 | 0          | 0          |
| `/datos` Datos           | no       | 14                 | 0          | 0          |
| `/bienvenida` Onboarding | no       | 11                 | 0          | 0          |
| `/sesion` Sesión         | no       | 12                 | 0          | 0          |

Sin errores de JavaScript en ninguna ruta. Los botones de calificar miden 84 × 66 px (el diseño
pide 64 de alto) y la hoja de próximo repaso 48 y 44.

## Lo que estaba mal y se arregló

| Qué                                    | Antes        | Ahora                             |
| -------------------------------------- | ------------ | --------------------------------- |
| Lista de ruta (45 filas)               | 390 × **26** | 390 × 44                          |
| Navegación superior                    | 60 × **36**  | 60 × 44                           |
| Pines del cuerpo                       | **9 × 9**    | 28–33 (área táctil invisible)     |
| Casillas de Biblioteca                 | **13 × 13**  | etiqueta de 44 que llena la celda |
| Borrar etapa, valor, unidad (Horarios) | 32–36        | 44                                |
| Enlaces de modo en Hoy                 | 60 × **20**  | 60 × 44                           |
| Controles de los editores              | 26–36        | 44                                |
| Texto «pendiente» en Mis cuerpos       | **9 px**     | 11 px                             |

**Dos problemas que los números no veían, y solo se vieron mirando la pantalla:**

1. **La cabecera se comía 144 px** de los 727 del móvil: ocho destinos envueltos en tres filas.
   Ahora la navegación es una fila que se desliza y el tema es un símbolo: **50 px**.
2. **En la sesión el contenido quedaba fuera de pantalla.** El mapa se llevaba media pantalla y la
   tarjeta empezaba en el píxel 722 de 727: solo se veía la cabeza ampliada y los botones. El alto
   del mapa pasó de estar en línea a estar en el CSS, que en móvil lo baja a 24 dvh. La tarjeta
   empieza ahora en el **438**.

**Y un bug de verdad:** entrar directo a `/sesion` —un marcador, la app instalada— armaba la cola
antes de que la siembra terminara y decía «no hay nada que repasar».

## Lo que sigue sin resolver

**Los puntos de la cabeza se amontonan.** Son 15 de los 45 en muy poco espacio; sus áreas táctiles
se solapan y tocar uno concreto es cuestión de suerte. El diseño lo resuelve con una **lupa**
(`PalacioApp.dc.html`) que no está construida.

Mientras tanto, la vía fiable es la **lista de ruta**, que ahora mide 44 px por fila y nombra cada
punto con su traducción. No es lo que pide el diseño, pero funciona.

## Cómo se comprueba

`npm run e2e` incluye, en el proyecto `movil`:

- que ninguna de las ocho rutas desborda a lo ancho ni dispara el zoom del navegador;
- que la cabecera mide menos de 80 px;
- que en la sesión la tarjeta empieza bien por encima del borde inferior;
- que los cuatro botones de calificar caben y miden ≥ 64 px de alto;
- que entrar directo a `/sesion` espera a la siembra.

---

# Segunda auditoría — poder leer lo que se elige (2026-10-16)

La primera auditoría midió desbordes, zoom y áreas táctiles, y todo salía en verde. No midió lo
único que importaba: **si al elegir un punto se puede leer el punto**. No se podía.

## Lo que estaba roto

Medido con un Pixel 5 (393 × 727), contra el build de producción.

| Pantalla     | Columna lateral | Tapaba del panel | Qué pasaba                                 |
| ------------ | --------------- | ---------------- | ------------------------------------------ |
| `/inspector` | 760 px sticky   | **760 px**       | el cuerpo se montaba sobre todo el detalle |
| `/editor`    | 414 px sticky   | 276 px           | el panel de edición, debajo del cuerpo     |
| `/cuerpos`   | 388 px sticky   | 388 px           | los controles de apariencia, tapados       |
| `/punto/:id` | 344 px sticky   | 344 px           | el formulario del punto, tapado            |

Dos cosas más:

- En `/inspector` el detalle **nacía en el píxel 1180** de una pantalla de 727: tocar un pin no
  producía ningún efecto visible. Y la columna lateral medía **760 px, más que la pantalla
  entera**.
- En `/sesion` al revelar quedaban **199 px** para leer, y el botón «Revelar» caía **68 px por
  debajo del borde** una vez que el cuerpo recuperó su tamaño.

La causa de las cuatro primeras filas es una sola: `position: sticky` fuera de su media query
(D-077). La del Inspector y la sesión, el presupuesto vertical de un teléfono (D-079).

## Lo que se ve ahora

| Medida                                     | Antes      | Ahora      |
| ------------------------------------------ | ---------- | ---------- |
| Solape columna/panel, las cuatro pantallas | 276–760 px | **0 px**   |
| Columna lateral del Inspector              | 760 px     | 458 px     |
| Detalle tras tocar un pin (`/inspector`)   | y=1180     | **y=0**    |
| Sitio para leer el contenido (`/sesion`)   | 199 px     | **637 px** |
| Cuerpo al recordar / al leer (`/sesion`)   | 277/277    | 444/224 px |
| «Revelar» alcanzable sin desplazar         | no         | sí         |

## Lo que sigue sin resolver

Los puntos de la cabeza siguen amontonados: la **lupa** del diseño sigue sin construirse y la vía
fiable sigue siendo la lista de ruta (ver arriba).

En `/editor` tocar un punto **no** lleva el panel a la vista, a propósito: en los modos de mover y
crear puntos se toca el lienzo muchas veces seguidas y desplazar la pantalla en cada toque pelearía
con el usuario. El panel ya es alcanzable sin el sticky.

## Cómo se comprueba

`npm run e2e`, proyecto `movil`, además de lo de la primera auditoría:

- que en las cuatro pantallas con columna lateral el solape es 0, que el toque sobre la cabecera
  del panel lo recibe el panel (`elementFromPoint`) y que la columna mide menos que la pantalla;
- que tocar un pin en `/inspector` sube el detalle por encima del píxel 120;
- que «Revelar» cabe en pantalla en las fases de señalar y de escena;
- que al revelar quedan más de 400 px entre la tarjeta y los calificadores, con la pregunta aún
  visible;
- que el cuerpo mide más de 300 px al recordar y menos del 60 % de eso al leer.

Y en `npm test`, `tests/movil.test.tsx`: que `revealPanel` desplaza en una columna, no hace nada en
escritorio, y que el Inspector lo aplica al detalle y solo en el teléfono.
