/**
 * El servidor de avisos de Palacio Corporal.
 *
 * Es lo único que no cabe en una PWA: en un iPhone, avisar **con la app
 * cerrada** a una hora exacta solo se consigue con Web Push, y un push lo
 * manda un servidor (D-091, D-092).
 *
 * Hace lo mínimo imprescindible:
 *
 * 1. La app se suscribe y manda **cuándo** le tocan sus próximos repasos.
 * 2. Un cron mira cada cinco minutos cuáles ya han llegado.
 * 3. Envía un push **sin contenido** —solo un golpecito—, y el service worker
 *    del teléfono cuenta los vencidos leyendo su propia base y escribe el
 *    aviso.
 *
 * Ese último punto es el importante: **aquí no se guarda nada de lo que
 * estudias**. Solo marcas de tiempo. Ni los puntos, ni los ítems, ni cuántos
 * son. Y además evita cifrar la carga útil, que es la parte fea del protocolo.
 */

/** Cuántas marcas de tiempo se aceptan por suscripción. */
const MAX_FECHAS = 60;
/** Margen: un repaso que venció hace más de esto ya no se avisa. */
const CADUCA_MS = 6 * 60 * 60 * 1000;
/** Sin noticias de un dispositivo en este tiempo, se olvida. */
const OLVIDO_MS = 90 * 24 * 60 * 60 * 1000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

function b64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** La clave de KV: el endpoint es largo y no sirve como clave, así que se resume. */
async function claveDe(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return `sub:${b64url(hash)}`;
}

/**
 * El JWT que firma cada envío.
 *
 * `aud` es el origen del servicio de push (Apple, Google…), `exp` no puede
 * pasar de 24 h y `sub` es un contacto por si algo va mal.
 */
async function firmarVapid(aud, env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: env.VAPID_SUBJECT ?? 'mailto:nadie@example.com',
      }),
    ),
  );
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(firma)}`;
}

/** Un golpecito al dispositivo. Sin contenido: lo escribe su service worker. */
async function empujar(subscription, env) {
  const url = new URL(subscription.endpoint);
  const jwt = await firmarVapid(url.origin, env);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'normal',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      // Sin cuerpo: no hay nada que cifrar ni que filtrar.
      'Content-Length': '0',
    },
  });
}

/** Deja solo las fechas futuras o recién vencidas, y como mucho `MAX_FECHAS`. */
export function limpiarFechas(fechas, ahora) {
  const limite = ahora - CADUCA_MS;
  return [...new Set(fechas)]
    .filter((f) => typeof f === 'number' && Number.isFinite(f) && f > limite)
    .sort((a, b) => a - b)
    .slice(0, MAX_FECHAS);
}

/** Si toca avisar: hay alguna fecha ya cumplida y no caducada. */
export function tocaAvisar(fechas, ahora) {
  return fechas.some((f) => f <= ahora && f > ahora - CADUCA_MS);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === '/clave-publica') {
      return json({ key: env.VAPID_PUBLIC_KEY });
    }

    if (url.pathname === '/suscribir' && request.method === 'POST') {
      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch {
        return json({ error: 'cuerpo ilegible' }, 400);
      }
      const sub = cuerpo?.subscription;
      if (!sub?.endpoint || typeof sub.endpoint !== 'string') {
        return json({ error: 'falta la suscripción' }, 400);
      }
      const fechas = limpiarFechas(cuerpo?.dueAts ?? [], Date.now());
      await env.AVISOS.put(
        await claveDe(sub.endpoint),
        JSON.stringify({ subscription: sub, dueAts: fechas, visto: Date.now() }),
      );
      return json({ ok: true, programados: fechas.length });
    }

    if (url.pathname === '/suscribir' && request.method === 'DELETE') {
      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch {
        return json({ error: 'cuerpo ilegible' }, 400);
      }
      if (!cuerpo?.endpoint) return json({ error: 'falta el endpoint' }, 400);
      await env.AVISOS.delete(await claveDe(cuerpo.endpoint));
      return json({ ok: true });
    }

    return json({ error: 'no existe' }, 404);
  },

  /** El cron: cada cinco minutos, mira a quién le toca. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(repartir(env));
  },
};

export async function repartir(env) {
  const ahora = Date.now();
  let cursor;
  let enviados = 0;

  do {
    const lista = await env.AVISOS.list({ prefix: 'sub:', cursor });
    cursor = lista.list_complete ? undefined : lista.cursor;

    for (const entrada of lista.keys) {
      const crudo = await env.AVISOS.get(entrada.name);
      if (!crudo) continue;
      const registro = JSON.parse(crudo);

      // Un dispositivo que lleva meses sin dar señales se olvida.
      if (ahora - (registro.visto ?? 0) > OLVIDO_MS) {
        await env.AVISOS.delete(entrada.name);
        continue;
      }

      if (!tocaAvisar(registro.dueAts ?? [], ahora)) continue;

      const respuesta = await empujar(registro.subscription, env);
      // 404/410: el navegador tiró la suscripción. Se borra y ya.
      if (respuesta.status === 404 || respuesta.status === 410) {
        await env.AVISOS.delete(entrada.name);
        continue;
      }

      // Lo avisado se quita, para no repetirlo en el siguiente cron.
      registro.dueAts = (registro.dueAts ?? []).filter((f) => f > ahora);
      await env.AVISOS.put(entrada.name, JSON.stringify(registro));
      enviados += 1;
    }
  } while (cursor);

  return enviados;
}
