import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BODY_SILHOUETTE, BODY_VIEWBOX } from '@/design/assets';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { ID, Item, Locus, LocusState, SceneObject, Zone } from '@/domain/types';
import {
  listItemsByLocus,
  listLoci,
  listPalaces,
  listSceneObjects,
  listZones,
  statusByLocus,
} from '@/db';
import { BlockView } from './BlockView';
import './inspector.css';

// Lienzo: cuerpo frontal + hueco del 22 % del ancho de un cuerpo + cuerpo posterior.
const GAP = BODY_VIEWBOX.width * 0.22;
const BACK_X = BODY_VIEWBOX.width + GAP;
const CANVAS_W = BODY_VIEWBOX.width * 2 + GAP;

// Tamaño del punto en unidades del viewBox: 5,2 % del alto del cuerpo, y 2,6 %
// para los puntos densos (cabeza, manos). La Fase 4 lo recalculará en píxeles
// reales con un ResizeObserver, que es lo que pide el diseño.
const PIN = BODY_VIEWBOX.height * 0.052;
const PIN_DENSE = BODY_VIEWBOX.height * 0.026;

interface Placed {
  locus: Locus;
  state: LocusState;
  cx: number;
  cy: number;
  r: number;
}

/**
 * Visor del contenido ingresado. Lee de IndexedDB con `useLiveQuery`, así que
 * se refresca solo cuando cambian los datos o los estados de repaso.
 *
 * En la Fase 4 se parte en `BodyMap` + `LocusDetail`; los componentes ya están
 * separados por responsabilidad para que ese corte no toque la lógica.
 */
export function Inspector() {
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  const palace = useLiveQuery(async () => (await listPalaces())[0], []);
  const palaceId = palace?.id;

  const map = useLiveQuery(async () => {
    if (palaceId === undefined) return undefined;
    const [loci, zones, statuses] = await Promise.all([
      listLoci(palaceId),
      listZones(palaceId),
      statusByLocus(palaceId, new Date()),
    ]);
    return { loci, zones, statuses };
  }, [palaceId]);

  const current = selectedId ?? map?.loci.find((l) => map.statuses[l.id] !== 'empty')?.id ?? null;

  const detail = useLiveQuery(async () => {
    if (current === null) return undefined;
    const [items, scene] = await Promise.all([
      listItemsByLocus(current),
      listSceneObjects(current),
    ]);
    return { items, scene };
  }, [current]);

  const placed = useMemo<Placed[]>(() => {
    if (!map) return [];
    return map.loci.map((locus) => ({
      locus,
      state: map.statuses[locus.id] ?? 'empty',
      cx: (locus.side === 'back' ? BACK_X : 0) + locus.pos.x * BODY_VIEWBOX.width,
      cy: locus.pos.y * BODY_VIEWBOX.height,
      r: (locus.dense === true ? PIN_DENSE : PIN) / 2,
    }));
  }, [map]);

  if (!palace || !map) {
    return (
      <section className="insp insp--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
        <p className="insp__hint">
          Si es la primera vez, se está sembrando el palacio. Si no aparece nada, genera la semilla
          con <code>npm run seed:fonetica</code>.
        </p>
      </section>
    );
  }

  const selected = placed.find((p) => p.locus.id === current);
  const filled = placed.filter((p) => p.state !== 'empty').length;

  return (
    <section className="insp">
      <header className="insp__head">
        <div>
          <h2>{palace.name}</h2>
          <p className="insp__sub">
            {placed.length} puntos · {filled} con contenido · {map.zones.length} zonas
          </p>
        </div>
        <ul className="insp__zones">
          {map.zones.map((zone: Zone) => (
            <li key={zone.id}>
              <span className="insp__zdot" style={{ background: `var(--zone-${zone.color})` }} />
              {zone.name}
            </li>
          ))}
        </ul>
      </header>

      <div className="insp__body">
        <div className="insp__map">
          <svg
            viewBox={`0 0 ${String(CANVAS_W)} ${String(BODY_VIEWBOX.height)}`}
            role="group"
            aria-label="Mapa del cuerpo con los puntos del palacio"
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
              const isSel = pin.locus.id === current;
              return (
                <g
                  key={pin.locus.id}
                  className={`pin${isSel ? ' pin--sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${String(pin.locus.routeNo)}. ${pin.locus.partName} — ${STATE_LABEL[pin.state]}`}
                  aria-pressed={isSel}
                  onClick={() => {
                    setSelectedId(pin.locus.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(pin.locus.id);
                    }
                  }}
                >
                  <title>{`${String(pin.locus.routeNo)}. ${pin.locus.partName}`}</title>
                  <circle
                    cx={pin.cx}
                    cy={pin.cy}
                    r={pin.r}
                    fill={`var(${STATE_TOKEN[pin.state]})`}
                    stroke="var(--state-edge)"
                    strokeWidth={1.5}
                  />
                  {pin.locus.dense !== true && (
                    <text x={pin.cx} y={pin.cy} className="pin__n">
                      {pin.locus.routeNo}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <ol className="insp__route">
            {placed.map((pin) => (
              <li key={pin.locus.id}>
                <button
                  type="button"
                  className={`insp__rbtn${pin.locus.id === current ? ' is-sel' : ''}`}
                  onClick={() => {
                    setSelectedId(pin.locus.id);
                  }}
                >
                  <span className="insp__rn mono">{pin.locus.routeNo}</span>
                  <span
                    className="insp__rdot"
                    style={{ background: `var(${STATE_TOKEN[pin.state]})` }}
                  />
                  {pin.locus.partName}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <article className="insp__detail">
          {!selected ? (
            <p>Elige un punto.</p>
          ) : (
            <>
              <h3>
                <span className="mono">{selected.locus.routeNo}</span> · {selected.locus.partName}
              </h3>
              <p className="insp__meta">
                {map.zones.find((z) => z.id === selected.locus.zoneId)?.name} · lado{' '}
                {selected.locus.side === 'back' ? 'posterior' : 'frontal'}
                {selected.locus.dense === true && ' · punto denso'} · {STATE_LABEL[selected.state]}
              </p>
              {selected.locus.anchor && (
                <p className="insp__anchor">{selected.locus.anchor.text}</p>
              )}

              {detail && detail.scene.length > 0 && (
                <ul className="insp__scene">
                  {detail.scene.map((object: SceneObject) => (
                    <li key={object.id}>
                      <strong>{object.text}</strong>
                      {object.represents !== undefined && <span> — {object.represents}</span>}
                    </li>
                  ))}
                </ul>
              )}

              {detail?.items.length === 0 ? (
                <p className="insp__empty">
                  Punto sin contenido.
                  {selected.locus.notes !== undefined && ` ${selected.locus.notes}`}
                </p>
              ) : (
                detail?.items.map((item: Item) => (
                  <div key={item.id}>
                    <p className="insp__front">{item.front}</p>
                    <p className="insp__back">{item.back}</p>
                    {item.blocks.map((block, i) => (
                      <BlockView key={i} block={block} />
                    ))}
                  </div>
                ))
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}
