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
