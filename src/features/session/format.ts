import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Fecha del próximo repaso en español: «Hoy, 19:50», «Mañana, 8:00»,
 * «jueves 16 de octubre, 8:00».
 *
 * Reloj de 24 h, no el de 12 h del prototipo: es menos ambiguo y la app está
 * en español (anotado en docs/HANDOFF_DISENO.md).
 */
export function formatDueAt(date: Date): string {
  const time = format(date, 'H:mm', { locale: es });
  if (isToday(date)) return `Hoy, ${time}`;
  if (isTomorrow(date)) return `Mañana, ${time}`;
  return `${capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }))}, ${time}`;
}
