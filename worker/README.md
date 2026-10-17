# El servidor de avisos

Un único Worker de Cloudflare que manda el push cuando toca un repaso. Existe
porque en un iPhone **no hay otra forma** de avisar con la app cerrada a una
hora exacta (`docs/DECISIONES.md` D-091).

## Qué guarda

Solo esto, por dispositivo:

```json
{ "subscription": { "endpoint": "https://web.push.apple.com/…" },
  "dueAts": [1792915200000, 1793001600000],
  "visto": 1792915000000 }
```

**Marcas de tiempo y nada más.** Ni los puntos, ni los ítems, ni cuántos son,
ni qué estudias. El push va **sin contenido**: es un golpecito, y el service
worker del teléfono cuenta los vencidos leyendo su propia base y escribe el
aviso. Así tu contenido no sale del móvil, y de paso nos ahorramos cifrar la
carga útil.

## Puesta en marcha

En `docs/AVISOS_PUSH.md`, paso a paso.
