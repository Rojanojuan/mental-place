import { useMemo } from 'react';
import { BODY_INNER, BODY_VIEWBOX } from '@/design/assets';
import { bodyStyleAttrs } from '@/design/body-style';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { ID, Locus, LocusState, PalaceStyle } from '@/domain/types';
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

/**
 * Área táctil mínima del punto, en unidades del viewBox.
 *
 * El diseño la pide de 28 px como mínimo (`PROMPT_MEJORAS.md` §1.3), pero un
 * punto denso se dibuja a 12 unidades: con el dedo es intocable. Se añade un
 * círculo transparente detrás, que no cambia el dibujo pero sí lo que se puede
 * tocar. En la cabeza se solapan —ahí la lista de ruta es la vía fiable—.
 */
const HIT_MIN = BODY_VIEWBOX.height * 0.078;

/** Un plano de casa: su dibujo y las medidas de su lienzo. */
export interface PlanSource {
  svg: string;
  w: number;
  h: number;
}

/**
 * Diámetro del punto en un plano: `0,3 × √(área / nº de puntos)`
 * (`PROMPT_MEJORAS.md` §5), con un suelo para que siga siendo tocable.
 */
function planPin(plan: PlanSource, count: number): number {
  return Math.max(10, 0.3 * Math.sqrt((plan.w * plan.h) / Math.max(1, count)));
}

export interface BodyMapProps {
  loci: Locus[];
  statusByLocus: Record<ID, LocusState>;
  /** Punto al que acerca la cámara. */
  focusId?: ID | null;
  /** Aumento al enfocar. 1 = vista general. */
  zoom?: number;
  selectedIds?: ID[];
  // Los manejadores admiten `undefined` explícito porque con
  // `exactOptionalPropertyTypes` el llamador no podría pasarlos condicionados.
  onLocusTap?: ((id: ID) => void) | undefined;
  /** Arrastrar un punto. La posición llega ya normalizada 0–1 con su lado. */
  onLocusDrag?:
    ((id: ID, pos: { x: number; y: number }, side: 'front' | 'back') => void) | undefined;
  /** Tocar el lienzo vacío: así se crean puntos en el editor. */
  onCanvasTap?: ((pos: { x: number; y: number }, side: 'front' | 'back') => void) | undefined;
  /** Alto máximo en la caja que lo contiene. */
  maxHeight?: string;
  className?: string;
  label?: string;
  /** Apariencia del cuerpo (`Palace.style`). */
  appearance?: PalaceStyle | undefined;
  /**
   * Plano de casa. Con él, el mapa pinta el plano en vez de las dos siluetas
   * y coloca los puntos sobre su lienzo.
   */
  plan?: PlanSource | undefined;
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
  onLocusDrag,
  onCanvasTap,
  maxHeight = '62dvh',
  className,
  label = 'Mapa del cuerpo con los puntos del palacio',
  appearance,
  plan,
}: BodyMapProps) {
  const body = bodyStyleAttrs(appearance);
  const canvasW = plan ? plan.w : CANVAS_W;
  const canvasH = plan ? plan.h : CANVAS_H;

  const placed = useMemo<Placed[]>(() => {
    const planDiameter = plan ? planPin(plan, loci.length) : 0;
    return loci.map((locus) => ({
      locus,
      state: statusByLocus[locus.id] ?? 'empty',
      cx: plan
        ? locus.pos.x * plan.w
        : (locus.side === 'back' ? BACK_X : 0) + locus.pos.x * BODY_VIEWBOX.width,
      cy: plan ? locus.pos.y * plan.h : locus.pos.y * BODY_VIEWBOX.height,
      d: plan ? planDiameter : locus.dense === true ? PIN_DENSE : PIN,
    }));
  }, [loci, plan, statusByLocus]);

  // Cámara: centra el punto enfocado. Los pines se contra-escalan para que su
  // tamaño aparente no cambie con el aumento.
  const focused = focusId === null ? undefined : placed.find((p) => p.locus.id === focusId);
  const scale = focused && zoom !== 1 ? zoom : 1;
  const tx = focused ? canvasW / 2 - focused.cx * scale : 0;
  const ty = focused ? canvasH / 2 - focused.cy * scale : 0;

  const selected = new Set(selectedIds);
  const interactive = onLocusTap !== undefined || onLocusDrag !== undefined;

  /**
   * Del punto del puntero a coordenadas normalizadas del cuerpo que toque.
   * Hay dos cuerpos en el lienzo, así que también se devuelve el lado.
   */
  const toBody = (event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget | null;
  }): { pos: { x: number; y: number }; side: 'front' | 'back' } | null => {
    const svg = (event.currentTarget as SVGSVGElement | null)?.ownerSVGElement ?? null;
    const root = svg ?? (event.currentTarget as SVGSVGElement | null);
    if (!root) return null;
    const box = root.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const vx = ((event.clientX - box.left) / box.width) * canvasW;
    const vy = ((event.clientY - box.top) / box.height) * canvasH;
    if (plan) {
      // En un plano no hay dos lados: el lienzo entero es el palacio.
      return {
        pos: { x: Number((vx / canvasW).toFixed(4)), y: Number((vy / canvasH).toFixed(4)) },
        side: 'front',
      };
    }
    const side: 'front' | 'back' = vx >= BACK_X ? 'back' : 'front';
    const x = (vx - (side === 'back' ? BACK_X : 0)) / BODY_VIEWBOX.width;
    if (x < 0 || x > 1) return null;
    return { pos: { x: Number(x.toFixed(4)), y: Number((vy / canvasH).toFixed(4)) }, side };
  };

  return (
    <svg
      className={className === undefined ? 'bodymap' : `bodymap ${className}`}
      viewBox={`0 0 ${String(canvasW)} ${String(canvasH)}`}
      // Con `none` no se escribe nada en línea: así el CSS puede decidirlo
      // por pantalla, que es lo que necesita el móvil.
      style={maxHeight === 'none' ? undefined : { maxHeight }}
      role="group"
      aria-label={label}
      onClick={
        onCanvasTap === undefined
          ? undefined
          : (event) => {
              // Solo el fondo: los pines tienen su propio manejador.
              if (event.target !== event.currentTarget) return;
              const hit = toBody(event);
              if (hit) onCanvasTap(hit.pos, hit.side);
            }
      }
    >
      <g
        className="bodymap__camera"
        transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(3)})`}
      >
        {plan ? (
          <g className="plan" dangerouslySetInnerHTML={{ __html: plan.svg }} />
        ) : (
          <>
            <g
              className={body.className}
              style={body.style}
              dangerouslySetInnerHTML={{ __html: BODY_INNER.front }}
            />
            <g
              className={body.className}
              style={body.style}
              transform={`translate(${String(BACK_X)} 0)`}
              dangerouslySetInnerHTML={{ __html: BODY_INNER.back }}
            />
          </>
        )}
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
              // Sin manejador el punto solo informa: anunciarlo como botón
              // llenaba el lector de pantalla de controles que no hacen nada.
              role={interactive ? 'button' : 'img'}
              tabIndex={interactive ? 0 : undefined}
              aria-label={`${String(pin.locus.routeNo)}. ${pin.locus.partName} — ${STATE_LABEL[pin.state]}`}
              aria-pressed={interactive ? isFocus : undefined}
              onPointerDown={
                onLocusDrag === undefined
                  ? undefined
                  : (event) => {
                      const start = { x: event.clientX, y: event.clientY };
                      const target = event.currentTarget;
                      let moved = false;
                      // jsdom (y algún navegador viejo) no lo implementa; sin
                      // el guardia, la excepción se llevaba por delante el toque.
                      try {
                        target.setPointerCapture(event.pointerId);
                      } catch {
                        // Sin captura el arrastre sigue funcionando.
                      }
                      const onMove = (move: PointerEvent): void => {
                        // Umbral de 4 px: por debajo, el gesto sigue siendo un toque.
                        if (
                          !moved &&
                          Math.hypot(move.clientX - start.x, move.clientY - start.y) < 4
                        ) {
                          return;
                        }
                        moved = true;
                        const hit = toBody({
                          clientX: move.clientX,
                          clientY: move.clientY,
                          currentTarget: target,
                        });
                        if (hit) onLocusDrag(pin.locus.id, hit.pos, hit.side);
                      };
                      const onUp = (): void => {
                        target.removeEventListener('pointermove', onMove);
                        target.removeEventListener('pointerup', onUp);
                        if (!moved) onLocusTap?.(pin.locus.id);
                      };
                      target.addEventListener('pointermove', onMove);
                      target.addEventListener('pointerup', onUp);
                    }
              }
              onClick={onLocusDrag === undefined ? () => onLocusTap?.(pin.locus.id) : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onLocusTap?.(pin.locus.id);
                }
              }}
            >
              <title>{`${String(pin.locus.routeNo)}. ${pin.locus.partName}`}</title>
              {/* Área táctil: invisible, nunca menor que el mínimo del diseño. */}
              <circle
                className="pin__hit"
                cx={pin.cx}
                cy={pin.cy}
                r={Math.max(r, HIT_MIN / 2 / scale)}
              />
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
