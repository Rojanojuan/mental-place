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
/**
 * La lista de dispositivos, en **una sola clave**.
 *
 * KV regala 100 000 lecturas al día pero solo 1 000 `list`, y el cron corre
 * una vez por minuto: 1 440 `list` no caben, 1 440 lecturas sobran de largo.
 * Por eso el índice se lee con un `get` y el cron puede ir al minuto en vez de
 * cada cinco (D-093).
 */
const INDICE = 'indice';

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
      const clave = await claveDe(sub.endpoint);
      await env.AVISOS.put(
        clave,
        JSON.stringify({ subscription: sub, dueAts: fechas, visto: Date.now() }),
      );
      await anotarEnIndice(env, clave);
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
      const clave = await claveDe(cuerpo.endpoint);
      await env.AVISOS.delete(clave);
      await olvidar(env, clave);
      return json({ ok: true });
    }

    return json({ error: 'no existe' }, 404);
  },

  /** El cron: cada cinco minutos, mira a quién le toca. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(repartir(env));
  },
};

/** Añade una clave al índice, si no estaba. */
async function anotarEnIndice(env, clave) {
  const claves = await leerIndice(env);
  if (claves.includes(clave)) return;
  claves.push(clave);
  await env.AVISOS.put(INDICE, JSON.stringify(claves));
}

/** Quita una clave del índice. */
async function olvidar(env, clave) {
  const claves = await leerIndice(env);
  const quedan = claves.filter((k) => k !== clave);
  if (quedan.length !== claves.length) {
    await env.AVISOS.put(INDICE, JSON.stringify(quedan));
  }
}

export async function leerIndice(env) {
  const crudo = await env.AVISOS.get(INDICE);
  if (!crudo) return [];
  try {
    const valor = JSON.parse(crudo);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

export async function repartir(env) {
  const ahora = Date.now();
  const claves = await leerIndice(env);
  const caducadas = [];
  let enviados = 0;

  for (const clave of claves) {
    const crudo = await env.AVISOS.get(clave);
    if (!crudo) {
      caducadas.push(clave);
      continue;
    }
    const registro = JSON.parse(crudo);

    // Un dispositivo que lleva meses sin dar señales se olvida.
    if (ahora - (registro.visto ?? 0) > OLVIDO_MS) {
      await env.AVISOS.delete(clave);
      caducadas.push(clave);
      continue;
    }

    if (!tocaAvisar(registro.dueAts ?? [], ahora)) continue;

    const respuesta = await empujar(registro.subscription, env);
    // 404/410: el navegador tiró la suscripción. Se borra y ya.
    if (respuesta.status === 404 || respuesta.status === 410) {
      await env.AVISOS.delete(clave);
      caducadas.push(clave);
      continue;
    }

    // Lo avisado se quita, para no repetirlo en el siguiente minuto.
    registro.dueAts = (registro.dueAts ?? []).filter((f) => f > ahora);
    await env.AVISOS.put(clave, JSON.stringify(registro));
    enviados += 1;
  }

  // El índice solo se reescribe si de verdad cambió: es una escritura, y de
  // esas solo hay 1 000 al día.
  if (caducadas.length > 0) {
    await env.AVISOS.put(INDICE, JSON.stringify(claves.filter((k) => !caducadas.includes(k))));
  }
  return enviados;
}
