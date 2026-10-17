/**
 * Los repasos, como calendario (.ics).
 *
 * En un iPhone es la **única** forma de que suene una alarma a la hora exacta
 * sin montar un servidor: `periodicsync` no existe en iOS y Notification
 * Triggers nunca pasó de prueba, así que el aviso con la app cerrada o es un
 * push desde un servidor o es el calendario del propio teléfono (D-091).
 *
 * Esto es una **foto**: al calificar cambian las fechas y hay que volver a
 * exportar. La pantalla lo dice; prometer otra cosa sería engañar.
 *
 * Módulo puro, sin DOM: se prueba sin navegador.
 */

export interface IcsEvent {
  /** Momento exacto del repaso. */
  at: Date;
  summary: string;
  description?: string | undefined;
  /** Identificador estable, para que reimportar no duplique. */
  uid: string;
}

/** `20261017T080000Z`, que es como el formato pide las fechas en UTC. */
export function icsDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escapa lo que el formato trata como separador. */
export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Parte una línea a 75 octetos, continuándola con un espacio.
 *
 * Lo pide el RFC 5545 y no es cosmético: sin plegar, un nombre de punto largo
 * rompe el archivo y el calendario no lo abre. Se cuenta en **octetos**, no en
 * caracteres, porque «ñ» o «ː» ocupan más de uno.
 */
export function icsFold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const partes: string[] = [];
  let actual = '';
  let largo = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    // La primera línea admite 75; las siguientes, 74 más el espacio inicial.
    const tope = partes.length === 0 ? 75 : 74;
    if (largo + n > tope) {
      partes.push(actual);
      actual = '';
      largo = 0;
    }
    actual += ch;
    largo += n;
  }
  if (actual !== '') partes.push(actual);
  return partes.join('\r\n ');
}

/**
 * El calendario completo.
 *
 * Cada repaso es un evento de diez minutos con una alarma a su hora. No se
 * repite nada: la repetición espaciada no es periódica, cada checkpoint cae
 * donde el motor diga.
 */
export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lineas: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Palacio Corporal//Repasos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Palacio Corporal · repasos',
  ];

  for (const ev of events) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(ev.at)}`,
      'DURATION:PT10M',
      `SUMMARY:${icsEscape(ev.summary)}`,
    );
    if (ev.description !== undefined && ev.description !== '') {
      lineas.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    }
    lineas.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0M',
      `DESCRIPTION:${icsEscape(ev.summary)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lineas.push('END:VCALENDAR');
  // CRLF, que es lo que pide el formato.
  return `${lineas.map(icsFold).join('\r\n')}\r\n`;
}
