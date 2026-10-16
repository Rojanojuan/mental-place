import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { InlineText } from '@/components/InlineText';
import { PalaceChips } from '@/components/PalaceChips';
import type { ID, ZoneAccent } from '@/domain/types';
import {
  getCurrentPalace,
  insertLocus,
  listLoci,
  listZones,
  moveLocus,
  newId,
  putLocus,
  putZone,
  removeLocus,
  removeZone,
  reorderRoute,
  resequenceRoute,
  statusByLocus,
} from '@/db';
import './palace-editor.css';

type Mode = 'points' | 'zones' | 'route';

const MODE_LABEL: Record<Mode, string> = {
  points: 'Puntos',
  zones: 'Zonas',
  route: 'Ruta',
};

const MODE_HINT: Record<Mode, string> = {
  points: 'Toca el cuerpo para crear un punto. Arrastra uno para moverlo.',
  zones: 'Elige una zona y toca los puntos que le pertenecen.',
  route: 'Súbelos o bájalos para cambiar el orden del recorrido.',
};

const ACCENTS: ZoneAccent[] = ['cabeza', 'hombros', 'torso', 'brazos', 'piernas'];

/** Editor de palacio: crear y mover puntos, asignar zonas y ordenar la ruta. */
export function PalaceEditor() {
  const [mode, setMode] = useState<Mode>('points');
  const [paintZone, setPaintZone] = useState<ID | null>(null);
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  const data = useLiveQuery(async () => {
    const palace = await getCurrentPalace();
    if (!palace) return { palace: undefined };
    const [loci, zones, statuses] = await Promise.all([
      listLoci(palace.id),
      listZones(palace.id),
      statusByLocus(palace.id, new Date()),
    ]);
    return { palace, loci, zones, statuses };
  }, []);

  if (!data) {
    return (
      <section className="pae pae--msg">
        <p className="insp__shimmer">Abriendo el palacio…</p>
      </section>
    );
  }

  if (!data.palace) {
    return (
      <section className="pae pae--msg">
        <h2>Todavía no hay ningún palacio</h2>
        <p className="pae__hint">
          Importa uno desde <Link to="/datos">Datos</Link>.
        </p>
      </section>
    );
  }

  const palace = data.palace;

  const createAt = async (pos: { x: number; y: number }, side: 'front' | 'back'): Promise<void> => {
    const routeNo = data.loci.length + 1;
    const id = newId('loc');
    await insertLocus({
      id,
      palaceId: palace.id,
      routeNo,
      partName: `Punto ${String(routeNo)}`,
      side,
      pos,
      ...(paintZone === null ? {} : { zoneId: paintZone }),
    });
    setSelectedId(id);
  };

  const tapLocus = async (id: ID): Promise<void> => {
    if (mode === 'zones' && paintZone !== null) {
      const locus = data.loci.find((entry) => entry.id === id);
      if (locus) await putLocus({ ...locus, zoneId: paintZone });
      return;
    }
    setSelectedId(id);
  };

  const move = (ids: ID[], index: number, delta: number): void => {
    const next = [...ids];
    const target = index + delta;
    const self = next[index];
    const other = next[target];
    if (self === undefined || other === undefined) return;
    next[index] = other;
    next[target] = self;
    void reorderRoute(next);
  };

  const addZone = async (): Promise<void> => {
    const order = data.zones.length;
    await putZone({
      id: newId('zon'),
      palaceId: palace.id,
      name: `Zona ${String(order + 1)}`,
      color: ACCENTS[order % ACCENTS.length] ?? 'cabeza',
      order,
    });
  };

  const ids = data.loci.map((locus) => locus.id);

  return (
    <section className="pae">
      <PalaceChips
        currentId={palace.id}
        onChange={() => {
          setSelectedId(null);
        }}
      />
      <header className="pae__head">
        <div>
          <h2>Editor · {palace.name}</h2>
          <p className="pae__hint">{MODE_HINT[mode]}</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Modo de edición">
          {(Object.keys(MODE_LABEL) as Mode[]).map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={mode === entry}
              className={`tabs__btn${mode === entry ? ' is-sel' : ''}`}
              onClick={() => {
                setMode(entry);
              }}
            >
              {MODE_LABEL[entry]}
            </button>
          ))}
        </div>
      </header>

      <div className={`pae__grid${palace.planData ? ' pae__grid--plan' : ''}`}>
        <div className="pae__map">
          <BodyMap
            loci={data.loci}
            statusByLocus={data.statuses}
            appearance={palace.style}
            plan={palace.planData}
            selectedIds={selectedId === null ? [] : [selectedId]}
            onLocusTap={(id) => {
              void tapLocus(id);
            }}
            onLocusDrag={
              mode === 'points'
                ? (id, pos) => {
                    void moveLocus(id, pos);
                  }
                : undefined
            }
            onCanvasTap={
              mode === 'points'
                ? (pos, side) => {
                    void createAt(pos, side);
                  }
                : undefined
            }
            label="Editor del palacio"
          />
          <p className="pae__count">
            {data.loci.length} puntos · {data.zones.length} zonas
          </p>
        </div>

        <div className="pae__panel">
          {mode === 'zones' && (
            <>
              <h3>Zonas</h3>
              <ul className="pae__zones">
                {data.zones.map((zone) => (
                  <li key={zone.id}>
                    <button
                      type="button"
                      className={`pae__zbtn${paintZone === zone.id ? ' is-sel' : ''}`}
                      onClick={() => {
                        setPaintZone(paintZone === zone.id ? null : zone.id);
                      }}
                    >
                      <span
                        className="pae__zdot"
                        style={{ background: `var(--zone-${zone.color})` }}
                      />
                      {zone.name}
                      <span className="pae__zcount mono">
                        {data.loci.filter((locus) => locus.zoneId === zone.id).length}
                      </span>
                    </button>
                    <InlineText
                      label={`Nombre de ${zone.name}`}
                      value={zone.name}
                      onCommit={(name) => {
                        void putZone({ ...zone, name });
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Borrar ${zone.name}`}
                      className="pae__del"
                      onClick={() => {
                        void removeZone(zone.id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void addZone();
                }}
              >
                Añadir zona
              </button>
              <p className="pae__hint">Borrar una zona no borra sus puntos: se quedan sin zona.</p>
            </>
          )}

          {mode !== 'zones' && (
            <>
              <h3>Ruta</h3>
              <ol className="pae__route">
                {data.loci.map((locus, index) => (
                  <li key={locus.id} className={locus.id === selectedId ? 'is-sel' : undefined}>
                    <span className="pae__rn mono">{locus.routeNo}</span>
                    {mode === 'points' ? (
                      <InlineText
                        className="pae__rinput"
                        label={`Nombre de ${locus.partName}`}
                        value={locus.partName}
                        onCommit={(partName) => {
                          void putLocus({ ...locus, partName });
                        }}
                      />
                    ) : (
                      <Link className="pae__rname" to={`/punto/${locus.id}`}>
                        {locus.partName}
                      </Link>
                    )}
                    {mode === 'route' ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Subir ${locus.partName}`}
                          disabled={index === 0}
                          onClick={() => {
                            move(ids, index, -1);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar ${locus.partName}`}
                          disabled={index === data.loci.length - 1}
                          onClick={() => {
                            move(ids, index, 1);
                          }}
                        >
                          ↓
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Borrar ${locus.partName}`}
                        className="pae__del"
                        onClick={() => {
                          void removeLocus(locus.id);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {mode === 'route' && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    void resequenceRoute(palace.id);
                  }}
                >
                  Renumerar 1…{data.loci.length}
                </button>
              )}
              {selectedId !== null && (
                <Link className="btn pae__open" to={`/punto/${selectedId}`}>
                  Abrir el punto elegido
                </Link>
              )}
              <p className="pae__hint">
                Borrar un punto no borra sus ítems: pasan a «Sin asignar». El nombre se edita aquí
                mismo en modo Puntos; lo demás, abriendo el punto.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
