import { PALACE_STYLE_DEFAULTS, type PalaceStyle } from '@/domain/types';

/**
 * Tonos de piel. El traspaso nombra los siete valores de `skin` pero no da sus
 * colores, así que se eligieron aquí en oklch, de más claro a más oscuro
 * (docs/DECISIONES.md D-058). `plano` es sin relleno, solo contorno.
 */
export const SKIN_FILL: Record<PalaceStyle['skin'], string> = {
  neutral: 'oklch(0.72 0.03 70)',
  porcelana: 'oklch(0.88 0.03 60)',
  arena: 'oklch(0.80 0.06 70)',
  miel: 'oklch(0.72 0.09 65)',
  canela: 'oklch(0.60 0.08 55)',
  ebano: 'oklch(0.42 0.05 50)',
  plano: 'transparent',
};

/**
 * Qué claves de `Palace.style` puede aplicar la app con la silueta entregada.
 *
 * El SVG trae cinco capas —orejas, contorno, rasgos, articulaciones y
 * músculos— pero **no** las de cabello, vello facial ni gafas que describe
 * `PROMPT_MEJORAS.md` §3. Ver `docs/HANDOFF_DISENO.md` §3.11.
 */
export const APPLIED_KEYS = ['accent', 'detail', 'line', 'skin', 'vol', 'draw'] as const;
export const PENDING_KEYS = ['hair', 'hairColor', 'facial', 'glasses'] as const;

export interface BodyStyleAttrs {
  className: string;
  style: Record<string, string>;
}

/** Traduce la apariencia del palacio a clases y variables CSS para el mapa. */
export function bodyStyleAttrs(style?: PalaceStyle): BodyStyleAttrs {
  const s = { ...PALACE_STYLE_DEFAULTS, ...style };
  const className = [
    'body',
    `body--detail-${s.detail}`,
    `body--line-${s.line}`,
    `body--vol-${s.vol}`,
    `body--draw-${s.draw}`,
  ].join(' ');
  return {
    className,
    style: {
      '--body-accent': `var(--zone-${s.accent})`,
      '--body-skin': SKIN_FILL[s.skin],
    },
  };
}
