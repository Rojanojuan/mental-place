import { useMemo } from 'react';
import { BODY_SILHOUETTE, BODY_VIEWBOX } from '@/design/assets';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { ID, Locus, LocusState } from '@/domain/types';
import './body-map.css';

/** Hueco entre el cuerpo frontal y el posterior: 22 % del ancho de un cuerpo. */
const GAP = BODY_VIEWBOX.width * 0.22;
const BACK_X = BODY_VIEWBOX.width + GAP;
const CANVAS_W = BODY_VIEWBOX.width * 2 + GAP;
const CANVAS_H = BODY_VIEWBOX.height;

/** Diámetro del punto: 5,2 % del alto del cuerpo; 2,6 % si es denso. */
const PIN = BODY_VIEWBOX.height * 0.052;
const PIN_DENSE = BODY_VIEWBOX.height * 0.026;
/** Por debajo de este diámetro aparente el número no se lee: se oculta. */
const NUMBER_MIN = 13;

export interface BodyMapProps {
  loci: Locus[];
  statusByLocus: Record<ID, LocusState>;
  /** Punto al que acerca la cámara. */
  focusId?: ID | null;
  /** Aumento al enfocar. 1 = vista general. */
  zoom?: number;
  selectedIds?: ID[];
  onLocusTap?: (id: ID) => void;
  /** Alto máximo en la caja que lo contiene. */
  maxHeight?: string;
  className?: string;
  label?: string;
}

interface Placed {
  locus: Locus;
  state: LocusState;
  cx: number;
  cy: number;
  d: number;
}

/**
 * El mapa del palacio: las dos siluetas con un punto por locus, coloreado por
 * estado y con la cámara centrada en el punto enfocado.
 *
 * Es un componente de presentación: recibe los puntos y sus estados, y avisa
 * de los toques. No consulta la base de datos ni el motor de repaso.
 */
export function BodyMap({
  loci,
  statusByLocus,
  focusId = null,
  zoom = 1,
  selectedIds = [],
  onLocusTap,
  maxHeight = '62dvh',
  className,
  label = 'Mapa del cuerpo con los puntos del palacio',
}: BodyMapProps) {
  const placed = useMemo<Placed[]>(
    () =>
      loci.map((locus) => ({
        locus,
        state: statusByLocus[locus.id] ?? 'empty',
        cx: (locus.side === 'back' ? BACK_X : 0) + locus.pos.x * BODY_VIEWBOX.width,
        cy: locus.pos.y * BODY_VIEWBOX.height,
        d: locus.dense === true ? PIN_DENSE : PIN,
      })),
    [loci, statusByLocus],
  );

  // Cámara: centra el punto enfocado. Los pines se contra-escalan para que su
  // tamaño aparente no cambie con el aumento.
  const focused = focusId === null ? undefined : placed.find((p) => p.locus.id === focusId);
  const scale = focused && zoom !== 1 ? zoom : 1;
  const tx = focused ? CANVAS_W / 2 - focused.cx * scale : 0;
  const ty = focused ? CANVAS_H / 2 - focused.cy * scale : 0;

  const selected = new Set(selectedIds);

  return (
    <svg
      className={className === undefined ? 'bodymap' : `bodymap ${className}`}
      viewBox={`0 0 ${String(CANVAS_W)} ${String(CANVAS_H)}`}
      style={{ maxHeight }}
      role="group"
      aria-label={label}
    >
      <g
        className="bodymap__camera"
        transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(3)})`}
      >
        <image
          href={BODY_SILHOUETTE.front}
          x={0}
          y={0}
          width={BODY_VIEWBOX.width}
          height={BODY_VIEWBOX.height}
        />
        <image
          href={BODY_SILHOUETTE.back}
          x={BACK_X}
          y={0}
          width={BODY_VIEWBOX.width}
          height={BODY_VIEWBOX.height}
        />
        {placed.map((pin) => {
          const isFocus = pin.locus.id === focusId;
          const d = pin.d / scale;
          const r = d / 2;
          const showNumber = d * scale >= NUMBER_MIN;
          const classes = [
            'pin',
            `pin--${pin.state}`,
            isFocus ? 'pin--focus' : '',
            selected.has(pin.locus.id) ? 'pin--sel' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <g
              key={pin.locus.id}
              className={classes}
              role="button"
              tabIndex={0}
              aria-label={`${String(pin.locus.routeNo)}. ${pin.locus.partName} — ${STATE_LABEL[pin.state]}`}
              aria-pressed={isFocus}
              onClick={() => onLocusTap?.(pin.locus.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onLocusTap?.(pin.locus.id);
                }
              }}
            >
              <title>{`${String(pin.locus.routeNo)}. ${pin.locus.partName}`}</title>
              {/* Vencido: halo pulsante. Nunca solo color (contrato §3). */}
              {pin.state === 'due' && (
                <circle
                  className="pin__halo"
                  data-pc-pulse=""
                  cx={pin.cx}
                  cy={pin.cy}
                  r={r}
                  fill={`var(${STATE_TOKEN.due})`}
                />
              )}
              <circle
                className="pin__dot"
                cx={pin.cx}
                cy={pin.cy}
                r={r}
                fill={
                  pin.state === 'suspended' ? 'url(#pin-stripes)' : `var(${STATE_TOKEN[pin.state]})`
                }
                stroke={isFocus ? 'var(--accent)' : 'var(--state-edge)'}
                strokeWidth={isFocus ? 3 / scale : 1.5 / scale}
              />
              {/* Dominado: estrella, para no depender del color. */}
              {pin.state === 'mastered' && (
                <text x={pin.cx} y={pin.cy} className="pin__star" fontSize={d * 0.8}>
                  ★
                </text>
              )}
              {showNumber && pin.state !== 'mastered' && (
                <text x={pin.cx} y={pin.cy} className="pin__n" fontSize={d * 0.42}>
                  {pin.locus.routeNo}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <defs>
        {/* Suspendido: rayado, el patrón que pide el diseño. */}
        <pattern id="pin-stripes" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--state-suspended)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--sunken)" strokeWidth="2" />
        </pattern>
      </defs>
    </svg>
  );
}
