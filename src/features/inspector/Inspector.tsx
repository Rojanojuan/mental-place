import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { Lupa } from '@/components/Lupa';
import { revealPanel } from '@/components/reveal';
import { PalaceChips } from '@/components/PalaceChips';
import { PartTranslation } from '@/components/PartName';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { ID, Item, SceneObject, Zone } from '@/domain/types';
import {
  getCurrentPalace,
  listItemsByLocus,
  listLoci,
  listSceneObjects,
  listZones,
  statusByLocus,
} from '@/db';
import { BlockView } from './BlockView';
import './inspector.css';

/**
 * Recorre el palacio punto por punto para revisar el contenido ingresado.
 * Lee de IndexedDB con `useLiveQuery`: al calificar en una sesión, el color de
 * los puntos cambia aquí sin recargar.
 */
export function Inspector() {
  const [selectedId, setSelectedId] = useState<ID | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  /**
   * Elegir un punto, desde el cuerpo o desde la lista de ruta.
   *
   * En el telefono el detalle queda por debajo del borde inferior, asi que
   * tocar un pin no producia ningun efecto visible: hay que llevarlo a la
   * vista. En escritorio `revealPanel` no hace nada.
   */
  const selectLocus = (id: ID): void => {
    setSelectedId(id);
    revealPanel(detailRef.current);
  };

  const palace = useLiveQuery(() => getCurrentPalace(), []);
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

  const locus = map.loci.find((l) => l.id === current);
  const state = locus ? (map.statuses[locus.id] ?? 'empty') : 'empty';
  const filled = map.loci.filter((l) => map.statuses[l.id] !== 'empty').length;

  return (
    <section className="insp">
      <PalaceChips
        currentId={palace.id}
        onChange={() => {
          setSelectedId(null);
        }}
      />
      <header className="insp__head">
        <div>
          <h2>{palace.name}</h2>
          <p className="insp__sub">
            {map.loci.length} puntos · {filled} con contenido · {map.zones.length} zonas
          </p>
        </div>
        <ul className="insp__zones">
          {map.zones.map((zone: Zone) => (
            <li key={zone.id}>
              <Link
                className="insp__zlink"
                to={`/sesion?scope=zone&zona=${zone.id}`}
                title={`Repasar ${zone.name}`}
              >
                <span className="insp__zdot" style={{ background: `var(--zone-${zone.color})` }} />
                {zone.name}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <div className={`insp__body${palace.planData ? ' insp__body--plan' : ''}`}>
        <div className="insp__map">
          <BodyMap
            loci={map.loci}
            statusByLocus={map.statuses}
            appearance={palace.style}
            plan={palace.planData}
            selectedIds={current === null ? [] : [current]}
            onLocusTap={selectLocus}
          />
          {/* Los puntos amontonados, separados: sin esto, 15 de los 45 solo
              se podian elegir por la lista (D-088). */}
          {!palace.planData && (
            <Lupa
              loci={map.loci}
              statusByLocus={map.statuses}
              appearance={palace.style}
              selectedId={current}
              onLocusTap={selectLocus}
              title={`Lupa · ${map.zones[0]?.name ?? 'puntos juntos'}`}
            />
          )}

          <ol className="insp__route">
            {map.loci.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`insp__rbtn${entry.id === current ? ' is-sel' : ''}`}
                  onClick={() => {
                    selectLocus(entry.id);
                  }}
                >
                  <span className="insp__rn mono">{entry.routeNo}</span>
                  <span
                    className="insp__rdot"
                    style={{ background: `var(${STATE_TOKEN[map.statuses[entry.id] ?? 'empty']})` }}
                  />
                  <span className="insp__rpart">{entry.partName}</span>
                  <PartTranslation locus={entry} className="insp__ren" />
                </button>
              </li>
            ))}
          </ol>
        </div>

        <article className="insp__detail" ref={detailRef}>
          {!locus ? (
            <p>Elige un punto.</p>
          ) : (
            <>
              <h3>
                <span className="mono">{locus.routeNo}</span> · {locus.partName}{' '}
                <PartTranslation locus={locus} className="partx--beside" />
              </h3>
              <p className="insp__meta">
                {map.zones.find((z) => z.id === locus.zoneId)?.name} · lado{' '}
                {locus.side === 'back' ? 'posterior' : 'frontal'}
                {locus.dense === true && ' · punto denso'} · {STATE_LABEL[state]}
              </p>
              {locus.anchor && <p className="insp__anchor">{locus.anchor.text}</p>}

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
                  {locus.notes !== undefined && ` ${locus.notes}`}
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

              <div className="insp__cta">
                <Link className="btn insp__study" to={`/punto/${locus.id}`}>
                  Editar este punto
                </Link>
                {detail && detail.items.length > 0 && (
                  <Link className="btn insp__study" to={`/sesion?scope=locus&punto=${locus.id}`}>
                    Repasar este punto
                  </Link>
                )}
                {locus.zoneId !== undefined && (
                  <Link className="btn insp__study" to={`/sesion?scope=zone&zona=${locus.zoneId}`}>
                    Repasar la zona
                  </Link>
                )}
                <Link className="btn insp__study" to="/sesion?scope=palace">
                  Todo el palacio
                </Link>
                <Link className="btn insp__study" to="/sesion?scope=walk">
                  Recorrido
                </Link>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
