import { describe, expect, it } from 'vitest';
import { buildIcs, icsDate, icsEscape, icsFold } from '@/io';

describe('el calendario .ics', () => {
  const evento = {
    at: new Date(Date.UTC(2026, 9, 17, 8, 0, 0)),
    summary: 'Repasar: Pelo / Cabello',
    uid: 'x@palacio',
  };

  it('fecha en UTC con el formato del estándar', () => {
    expect(icsDate(evento.at)).toBe('20261017T080000Z');
  });

  it('escapa lo que el formato usa de separador', () => {
    expect(icsEscape('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
    expect(icsEscape('uno\ndos')).toBe('uno\\ndos');
  });

  it('pliega las líneas largas a 75 octetos, contando bien los acentos', () => {
    const larga = `SUMMARY:${'ñ'.repeat(80)}`;
    const plegada = icsFold(larga);
    expect(plegada).toContain('\r\n ');
    for (const linea of plegada.split('\r\n')) {
      expect(new TextEncoder().encode(linea).length).toBeLessThanOrEqual(75);
    }
  });

  it('una línea corta no se toca', () => {
    expect(icsFold('SUMMARY:corto')).toBe('SUMMARY:corto');
  });

  it('arma un calendario con su alarma a la hora del repaso', () => {
    const ics = buildIcs([evento], evento.at);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261017T080000Z');
    expect(ics).toContain('SUMMARY:Repasar: Pelo / Cabello');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // Siempre CRLF, que es lo que pide el formato.
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
  });

  it('sin repasos, el calendario es válido pero vacío', () => {
    const ics = buildIcs([], evento.at);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
