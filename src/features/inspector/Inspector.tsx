import { useEffect, useMemo, useState } from 'react';
import seedUrl from '../../../seed/fonetica45.json?url';
import { BODY_SILHOUETTE, BODY_VIEWBOX } from '@/design/assets';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { Bundle, ID, Item, Locus, LocusState, SceneObject, Zone } from '@/domain/types';
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

interface LocusView {
  locus: Locus;
  item: Item | undefined;
  zone: Zone | undefined;
  scene: SceneObject[];
  state: LocusState;
  cx: number;
  cy: number;
  r: number;
}

/**
 * Visor de verificación de la ingesta. Lee un paquete JSON v1 y lo pinta sobre
 * las siluetas del diseño. No toca la base de datos ni el motor de repaso: su
 * único trabajo es dejar ver que el contenido entró bien.
 *
 * En la Fase 4 se parte en `BodyMap` + `LocusDetail` con estas mismas props.
 */
export function Inspector() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(seedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo leer la semilla (HTTP ${res.status})`);
        return res.json() as Promise<Bundle>;
      })
      .then((data) => {
        if (!alive) return;
        setBundle(data);
        const withItem = data.loci?.find((l) => data.items?.some((i) => i.locusId === l.id));
        setSelectedId(withItem?.id ?? data.loci?.[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      alive = false;
    };
  }, []);

  const views = useMemo<LocusView[]>(() => {
    if (!bundle?.loci) return [];
    const items = bundle.items ?? [];
    const zones = bundle.zones ?? [];
    const scenes = bundle.sceneObjects ?? [];
    return [...bundle.loci]
      .sort((a, b) => a.routeNo - b.routeNo)
      .map((locus) => {
        const item = items.find((i) => i.locusId === locus.id);
        return {
          locus,
          item,
          zone: zones.find((z) => z.id === locus.zoneId),
          scene: scenes.filter((s) => s.locusId === locus.id).sort((a, b) => a.order - b.order),
          // Sin ReviewState todavía (Fase 2): con ítem = por estudiar, sin ítem = vacío.
          state: item ? 'new' : 'empty',
          cx: (locus.side === 'back' ? BACK_X : 0) + locus.pos.x * BODY_VIEWBOX.width,
          cy: locus.pos.y * BODY_VIEWBOX.height,
          r: (locus.dense === true ? PIN_DENSE : PIN) / 2,
        };
      });
  }, [bundle]);

  const selected = views.find((v) => v.locus.id === selectedId);
  const palace = bundle?.palaces?.[0];
  const filled = views.filter((v) => v.item).length;

  if (error !== null) {
    return (
      <section className="insp insp--msg">
        <h2>No se pudo cargar la semilla</h2>
        <p>{error}</p>
        <p className="insp__hint">
          Genérala con <code>npm run seed:fonetica</code>.
        </p>
      </section>
    );
  }

  if (!bundle) {
    return (
      <section className="insp insp--msg">
        <p className="insp__shimmer">Cargando la semilla…</p>
      </section>
    );
  }

  return (
    <section className="insp">
      <header className="insp__head">
        <div>
          <h2>{palace?.name ?? 'Palacio'}</h2>
          <p className="insp__sub">
            {views.length} puntos · {filled} con contenido · {bundle.zones?.length ?? 0} zonas
          </p>
        </div>
        <ul className="insp__zones">
          {(bundle.zones ?? []).map((z) => (
            <li key={z.id}>
              <span className="insp__zdot" style={{ background: `var(--zone-${z.color})` }} />
              {z.name}
            </li>
          ))}
        </ul>
      </header>

      <div className="insp__body">
        <div className="insp__map">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${BODY_VIEWBOX.height}`}
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
            {views.map((v) => {
              const isSel = v.locus.id === selectedId;
              return (
                <g
                  key={v.locus.id}
                  className={`pin${isSel ? ' pin--sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${v.locus.routeNo}. ${v.locus.partName} — ${STATE_LABEL[v.state]}`}
                  aria-pressed={isSel}
                  onClick={() => {
                    setSelectedId(v.locus.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(v.locus.id);
                    }
                  }}
                >
                  <title>{`${v.locus.routeNo}. ${v.locus.partName}`}</title>
                  <circle
                    cx={v.cx}
                    cy={v.cy}
                    r={v.r}
                    fill={`var(${STATE_TOKEN[v.state]})`}
                    stroke="var(--state-edge)"
                    strokeWidth={1.5}
                  />
                  {v.locus.dense !== true && (
                    <text x={v.cx} y={v.cy} className="pin__n">
                      {v.locus.routeNo}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <ol className="insp__route">
            {views.map((v) => (
              <li key={v.locus.id}>
                <button
                  type="button"
                  className={`insp__rbtn${v.locus.id === selectedId ? ' is-sel' : ''}`}
                  onClick={() => {
                    setSelectedId(v.locus.id);
                  }}
                >
                  <span className="insp__rn mono">{v.locus.routeNo}</span>
                  <span
                    className="insp__rdot"
                    style={{ background: `var(${STATE_TOKEN[v.state]})` }}
                  />
                  {v.locus.partName}
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
                {selected.zone?.name} · lado{' '}
                {selected.locus.side === 'back' ? 'posterior' : 'frontal'}
                {selected.locus.dense === true && ' · punto denso'} · {STATE_LABEL[selected.state]}
              </p>
              {selected.locus.anchor && (
                <p className="insp__anchor">{selected.locus.anchor.text}</p>
              )}

              {selected.scene.length > 0 && (
                <ul className="insp__scene">
                  {selected.scene.map((s) => (
                    <li key={s.id}>
                      <strong>{s.text}</strong>
                      {s.represents !== undefined && <span> — {s.represents}</span>}
                    </li>
                  ))}
                </ul>
              )}

              {!selected.item ? (
                <p className="insp__empty">
                  Punto sin contenido.
                  {selected.locus.notes !== undefined && ` ${selected.locus.notes}`}
                </p>
              ) : (
                <>
                  <p className="insp__front">{selected.item.front}</p>
                  <p className="insp__back">{selected.item.back}</p>
                  {selected.item.blocks.map((block, i) => (
                    <BlockView key={i} block={block} />
                  ))}
                </>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}
