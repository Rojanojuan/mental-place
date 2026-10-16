import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { STATE_LABEL } from '@/design/states';
import type { Item, Locus, SceneObject } from '@/domain/types';
import {
  getLocus,
  listItemsByLocus,
  listLoci,
  listSceneObjects,
  listZones,
  newId,
  putItem,
  putLocus,
  putSceneObject,
  removeSceneObject,
  reorderSceneObjects,
  statusByLocus,
  stamp,
} from '@/db';
import { listLogs } from '@/db';
import { formatDueAt } from '@/features/session/format';
import './locus-editor.css';

/** El contrato recomienda no pasar de cinco objetos de escena por punto. */
const SCENE_MAX = 5;

/**
 * Detalle del punto, editable: el ancla, las notas, los objetos de escena
 * (reordenables) y los ítems que guarda, con su historial.
 */
export function LocusEditor() {
  const { locusId } = useParams<{ locusId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Locus | null>(null);
  const [saved, setSaved] = useState(false);
  const [newScene, setNewScene] = useState('');

  const data = useLiveQuery(async () => {
    if (locusId === undefined) return undefined;
    const locus = await getLocus(locusId);
    if (!locus) return { locus: undefined };
    const [items, scene, zones, loci, statuses] = await Promise.all([
      listItemsByLocus(locusId),
      listSceneObjects(locusId),
      listZones(locus.palaceId),
      listLoci(locus.palaceId),
      statusByLocus(locus.palaceId, new Date()),
    ]);
    const logs = (await Promise.all(items.map((item) => listLogs(item.id)))).flat();
    logs.sort((a, b) => b.at.localeCompare(a.at));
    return { locus, items, scene, zones, loci, statuses, logs };
  }, [locusId]);

  if (!data) {
    return (
      <section className="lce lce--msg">
        <p className="insp__shimmer">Abriendo el punto…</p>
      </section>
    );
  }

  if (!data.locus) {
    return (
      <section className="lce lce--msg">
        <h2>Ese punto no existe</h2>
        <Link className="btn" to="/inspector">
          Volver al palacio
        </Link>
      </section>
    );
  }

  const locus = draft ?? data.locus;
  const state = data.statuses[locus.id] ?? 'empty';

  const edit = (change: (locus: Locus) => Locus): void => {
    setDraft(change(structuredClone(locus)));
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    if (!draft) return;
    await putLocus(draft);
    setDraft(null);
    setSaved(true);
  };

  const addScene = async (): Promise<void> => {
    const text = newScene.trim();
    if (text === '' || data.scene.length >= SCENE_MAX) return;
    await putSceneObject({
      id: newId('sob'),
      locusId: locus.id,
      text,
      order: data.scene.length + 1,
    });
    setNewScene('');
  };

  const addItem = async (): Promise<void> => {
    const id = newId('itm');
    await putItem({
      id,
      locusId: locus.id,
      templateId: 'tpl-libre',
      title: 'Ítem nuevo',
      blocks: [],
      tags: [],
      fields: {},
      origin: 'manual',
      createdAt: stamp(),
      updatedAt: stamp(),
    });
    await navigate(`/item/${id}`);
  };

  return (
    <section className="lce">
      <header className="lce__head">
        <div>
          <h2>
            <span className="mono">{locus.routeNo}</span> · {locus.partName}
          </h2>
          <p className="lce__sub">
            {data.zones.find((zone) => zone.id === locus.zoneId)?.name ?? 'Sin zona'} · lado{' '}
            {locus.side === 'back' ? 'posterior' : 'frontal'} · {STATE_LABEL[state]}
          </p>
        </div>
        <div className="lce__actions">
          {draft && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                void save();
              }}
            >
              Guardar
            </button>
          )}
          {saved && (
            <span className="lce__saved" role="status">
              Guardado
            </span>
          )}
          <Link className="btn" to="/inspector">
            Volver
          </Link>
        </div>
      </header>

      <div className="lce__grid">
        <div className="lce__map">
          {
            <BodyMap
              loci={data.loci}
              statusByLocus={data.statuses}
              focusId={locus.id}
              zoom={2.2}
              maxHeight="44dvh"
              label={`Punto ${locus.partName} señalado`}
            />
          }
        </div>

        <div className="lce__panel">
          <label className="blke__field">
            <span>Ancla — lo primero que se ve al llegar al punto</span>
            <input
              type="text"
              value={locus.anchor?.text ?? ''}
              onChange={(event) => {
                const text = event.target.value;
                edit((current) => {
                  if (text === '') {
                    const { anchor: _drop, ...rest } = current;
                    return rest;
                  }
                  return { ...current, anchor: { ...current.anchor, text } };
                });
              }}
            />
          </label>

          <label className="blke__field">
            <span>Nombre de la parte</span>
            <input
              type="text"
              value={locus.partName}
              onChange={(event) => {
                edit((current) => ({ ...current, partName: event.target.value }));
              }}
            />
          </label>

          <label className="blke__field">
            <span>Zona</span>
            <select
              value={locus.zoneId ?? ''}
              onChange={(event) => {
                const zoneId = event.target.value;
                edit((current) => {
                  if (zoneId === '') {
                    const { zoneId: _drop, ...rest } = current;
                    return rest;
                  }
                  return { ...current, zoneId };
                });
              }}
            >
              <option value="">— sin zona —</option>
              {data.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>

          <label className="blke__field">
            <span>Notas</span>
            <textarea
              rows={2}
              value={locus.notes ?? ''}
              onChange={(event) => {
                const notes = event.target.value;
                edit((current) => {
                  if (notes === '') {
                    const { notes: _drop, ...rest } = current;
                    return rest;
                  }
                  return { ...current, notes };
                });
              }}
            />
          </label>

          <h3>Objetos de escena</h3>
          <p className="lce__hint">
            {data.scene.length} de {SCENE_MAX}. Son las imágenes que codifican el contenido; más de
            cinco cuesta recordarlas.
          </p>
          <ul className="lce__scene">
            {data.scene.map((object: SceneObject, index) => (
              <li key={object.id}>
                <span className="lce__sorder mono">{index + 1}</span>
                <span className="lce__stext">
                  <strong>{object.text}</strong>
                  {object.represents !== undefined && <span> — {object.represents}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Subir ${object.text}`}
                  disabled={index === 0}
                  onClick={() => {
                    const ids = data.scene.map((entry) => entry.id);
                    const previous = ids[index - 1];
                    const self = ids[index];
                    if (previous !== undefined && self !== undefined) {
                      ids[index - 1] = self;
                      ids[index] = previous;
                      void reorderSceneObjects(ids);
                    }
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${object.text}`}
                  onClick={() => {
                    void removeSceneObject(object.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {data.scene.length < SCENE_MAX && (
            <div className="lce__addscene">
              <input
                type="text"
                aria-label="Nuevo objeto de escena"
                placeholder="p. ej. Globo"
                value={newScene}
                onChange={(event) => {
                  setNewScene(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void addScene();
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void addScene();
                }}
              >
                Añadir
              </button>
            </div>
          )}

          <h3>Ítems en este punto</h3>
          {data.items.length === 0 ? (
            <p className="lce__hint">Todavía no guarda nada.</p>
          ) : (
            <ul className="lce__items">
              {data.items.map((entry: Item) => (
                <li key={entry.id}>
                  <Link to={`/item/${entry.id}`}>{entry.title}</Link>
                  <span className="lce__itags">{entry.tags.join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              void addItem();
            }}
          >
            Añadir un ítem aquí
          </button>

          <h3>Historial</h3>
          {data.logs.length === 0 ? (
            <p className="lce__hint">Sin repasos todavía.</p>
          ) : (
            <ul className="lce__logs">
              {data.logs.slice(0, 10).map((log) => (
                <li key={log.id}>
                  <span className="mono">{formatDueAt(new Date(log.at))}</span>
                  <span>{log.grade}</span>
                  <span className="mono">
                    {log.stageBefore} → {log.stageAfter}
                  </span>
                  {log.manual && <span className="lce__manual">a mano</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
