# Avisos con la app cerrada — puesta en marcha

Diez minutos, una vez. Al final, el iPhone avisa a la hora del repaso aunque la app esté cerrada.

Por qué hace falta un servidor y no se puede de otra forma: `docs/DECISIONES.md` D-091.

---

## Lo que vas a montar

```
iPhone (app instalada)                 Cloudflare (gratis)
┌──────────────────────┐               ┌─────────────────────────┐
│ Se suscribe y manda  │ ──POST────▶   │ Worker                  │
│ SOLO las fechas      │               │  KV: { endpoint, fechas }│
│                      │               │                         │
│                      │               │ Cron cada 5 min         │
│ Service worker       │ ◀──push────   │  ¿alguna fecha llegó?   │
│  cuenta los vencidos │   (vacío)     └─────────────────────────┘
│  y escribe el aviso  │
└──────────────────────┘
```

**Tu contenido no sale del teléfono.** El servidor guarda marcas de tiempo y nada más; el push va
vacío y el aviso lo escribe el móvil leyendo su propia base.

---

## 1 · Las claves — **ya hechas**

Ya están generadas y colocadas:

- La **pública** está en `worker/wrangler.toml` y la verás abajo, en el paso 5.
- La **privada** está en `worker/.dev.vars`, que git ignora. De ahí la copias en el paso 3.

Si alguna vez quieres cambiarlas: `npm run vapid`.

> Comprobado antes de dejártelo: el Worker arrancado en local firma el JWT con ES256 y esa firma
> **verifica contra la clave pública**, el push sale con el cuerpo vacío y el cron no repite un
> aviso ya enviado. Lo que falta es solo desplegarlo con tu cuenta.

## 2 · La cuenta y el almacén

Crea una cuenta gratuita en <https://dash.cloudflare.com> y luego, desde la carpeta `worker/`:

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create AVISOS
```

El último comando imprime un `id`. Cópialo en `worker/wrangler.toml`, en `[[kv_namespaces]]`.

## 3 · Configura el Worker

En `worker/wrangler.toml` solo queda cambiar una cosa: `VAPID_SUBJECT`, que ahora pone
`mailto:tu-correo@example.com`. Ponle tu correo de verdad — lo piden los servicios de push por si
hay problemas con tus envíos.

La privada va como **secreto**, nunca en el archivo:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```

Cuando te lo pida, pega el contenido de `worker/.dev.vars` **sin** el `VAPID_PRIVATE_KEY=` del
principio: solo el JSON, desde `{` hasta `}`.

## 4 · Despliega

```bash
npx wrangler deploy
```

Te da una URL del tipo `https://palacio-avisos.TU-CUENTA.workers.dev`. Compruébala:

```bash
curl https://palacio-avisos.TU-CUENTA.workers.dev/clave-publica
```

Debe responder con tu clave pública.

## 5 · Dile a la app dónde está

En GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**.
Dos variables:

| Nombre                  | Valor                                          |
| ----------------------- | ---------------------------------------------- |
| `VITE_PUSH_SERVER`      | `https://palacio-avisos.TU-CUENTA.workers.dev` |
| `VITE_VAPID_PUBLIC_KEY` | la clave pública del paso 1                    |

Son **variables**, no secretos: viajan dentro de la app y no son secretas. Al siguiente empujón a
`main`, el despliegue las recoge solo.

## 6 · En el iPhone

1. Abre la app **instalada** desde la pantalla de inicio. En una pestaña de Safari, iOS no deja
   avisar: la propia pantalla te lo dirá.
2. **Datos → Permitir avisos**.
3. **Datos → Activar avisos a la hora exacta**.

Listo. Estudia algo y verás llegar el aviso en el minuto del siguiente checkpoint.

---

## Si algo no va

| Qué ves                                       | Qué pasa                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| No sale la sección de avisos a la hora exacta | Faltan las variables del paso 5, o no diste permiso de notificaciones.                  |
| «Falta instalar la app»                       | Estás en una pestaña de Safari. Compartir → Añadir a pantalla de inicio.                |
| Se activa pero no llega nada                  | Mira los registros: `npx wrangler tail` desde `worker/`.                                |
| Llegó tarde                                   | El cron va cada minuto, así que el margen es < 60 s más lo que tarde Apple en entregar. |

## Lo que cuesta

Nada, y con holgura. El plan gratuito da 100 000 lecturas de KV al día, 1 000 escrituras y 100 000
peticiones al Worker. Con un dispositivo se gastan **1 440 lecturas** (el cron, una por minuto) y
**unas 50 escrituras**. El cron lee el índice con un `get` y no con un `list` a propósito: de
`list` solo hay 1 000 al día y era lo que obligaba a esperar cinco minutos entre avisos
(`docs/DECISIONES.md` D-093).

## Si prefieres no montarlo

La app funciona igual sin esto: avisa al abrirla y en el minuto exacto mientras esté abierta, y
puedes exportar los repasos al calendario del teléfono desde **Datos**, que da alarma a la hora
exacta sin servidor ninguno.
