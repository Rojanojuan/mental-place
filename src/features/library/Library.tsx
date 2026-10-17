import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ID, Item, LocusState } from '@/domain/types';
import {
  assignItem,
  db,
  listPalaces,
  listZones,
  removeItem,
  setSuspended,
} from '@/db';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import { itemStatus } from '@/srs';
import './library.css';

type StateFilter = LocusState | 'all';

interface Row {
  item: Item;
  state: LocusState;
  palaceName: string;
  zoneId: string | undefined;
  locusLabel: string;
}

const STATE_OPTIONS: StateFilter[] = [
  'all',
  'new',
  'learning',
  'due',
  'review',
  'mastered',
  'suspended',
];

/**
 * Biblioteca: todos los ítems con filtros, selección en lote y la bandeja de
 * los que no están en ningún punto.
 */
export function Library() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const [zone, setZone] = useState<string>('all');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selected, setSelected] = useState<Set<ID>>(new Set());

  const data = useLiveQuery(async () => {
    const now = new Date();
    const [items, palaces, schedules] = await Promise.all([
      db.items.toArray(),
      listPalaces(),
      db.schedules.toArray(),
    ]);
    const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
    const palaceById = new Map(palaces.map((palace) => [palace.id, palace]));
    const loci = await db.loci.toArray();
    const locusById = new Map(loci.map((locus) => [locus.id, locus]));
    const zones = palaces[0] ? await listZones(palaces[0].id) : [];

    // Un `bulkGet` y no una consulta por ítem: con 10 000 la Biblioteca se
    // quedaba colgada abriendo la base (D-089).
    const estados = await db.reviewStates.bulkGet(items.map((item) => item.id));

    const rows: Row[] = [];
    items.forEach((item, i) => {
      const reviewState = estados[i];
      const locus = item.locusId === null ? undefined : locusById.get(item.locusId);
      const palace = locus ? palaceById.get(locus.palaceId) : undefined;
      rows.push({
        item,
        state: reviewState
          ? itemStatus(reviewState, now, scheduleById.get(reviewState.scheduleId))
          : 'new',
        palaceName: palace?.name ?? '',
        zoneId: locus?.zoneId,
        locusLabel: locus ? `${String(locus.routeNo)} · ${locus.partName}` : 'Sin asignar',
      });
    });
    rows.sort((a, b) => a.item.title.localeCompare(b.item.title, 'es'));
    return { rows, zones, loci };
  }, []);

  const filtered = useMemo<Row[]>(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (onlyUnassigned && row.item.locusId !== null) return false;
      if (state !== 'all' && row.state !== state) return false;
      if (zone !== 'all' && row.zoneId !== zone) return false;
      if (needle === '') return true;
      const haystack = [row.item.title, row.item.front ?? '', row.item.back ?? '', ...row.item.tags]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, onlyUnassigned, query, state, zone]);

  if (!data) {
    return (
      <section className="lib lib--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
      </section>
    );
  }

  const toggle = (id: ID): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batch = async (action: 'suspend' | 'resume' | 'unassign' | 'delete'): Promise<void> => {
    for (const id of selected) {
      if (action === 'suspend') await setSuspended(id, true);
      else if (action === 'resume') await setSuspended(id, false);
      else if (action === 'unassign') await assignItem(id, null);
      else await removeItem(id);
    }
    setSelected(new Set());
  };

  const unassigned = data.rows.filter((row) => row.item.locusId === null).length;

  return (
    <section className="lib">
      <header className="lib__head">
        <div>
          <h2>Biblioteca</h2>
          <p className="lib__sub">
            {data.rows.length} ítems · {unassigned} sin asignar
          </p>
        </div>
      </header>

      <div className="lib__filters">
        <label className="lib__search">
          <span className="lib__label">Buscar</span>
          <input
            type="search"
            placeholder="título, frente, reverso o etiqueta"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>

        <label>
          <span className="lib__label">Estado</span>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value as StateFilter);
            }}
          >
            {STATE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'Todos' : STATE_LABEL[option]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="lib__label">Zona</span>
          <select
            value={zone}
            onChange={(event) => {
              setZone(event.target.value);
            }}
          >
            <option value="all">Todas</option>
            {data.zones.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lib__check">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(event) => {
              setOnlyUnassigned(event.target.checked);
            }}
          />
          Solo sin asignar
        </label>
      </div>

      {selected.size > 0 && (
        <div className="lib__batch" role="toolbar" aria-label="Acciones en lote">
          <span className="lib__count">
            {selected.size} {selected.size === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void batch('suspend');
            }}
          >
            Pausar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void batch('resume');
            }}
          >
            Reanudar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void batch('unassign');
            }}
          >
            Quitar del punto
          </button>
          <button
            type="button"
            className="btn lib__danger"
            onClick={() => {
              void batch('delete');
            }}
          >
            Borrar
          </button>
        </div>
      )}

      <p className="lib__result" role="status">
        {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
      </p>

      <div className="lib__scroll">
        <table className="lib__table">
          <thead>
            <tr>
              <th scope="col" className="lib__pick">
                <span className="lib__sr">Seleccionar</span>
              </th>
              <th scope="col">Ítem</th>
              <th scope="col">Punto</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.item.id} className={selected.has(row.item.id) ? 'is-sel' : undefined}>
                <td className="lib__pick">
                  {/* La etiqueta llena la celda: se puede tocar en 44 px. */}
                  <label className="lib__pickbox">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${row.item.title}`}
                      checked={selected.has(row.item.id)}
                      onChange={() => {
                        toggle(row.item.id);
                      }}
                    />
                  </label>
                </td>
                <td>
                  <span className="lib__title">{row.item.title}</span>
                  {row.item.tags.length > 0 && (
                    <span className="lib__tags">{row.item.tags.join(' · ')}</span>
                  )}
                </td>
                <td>
                  {row.item.locusId === null ? (
                    <span className="lib__unassigned">Sin asignar</span>
                  ) : (
                    <span className="lib__locus">
                      <span className="mono">{row.locusLabel}</span>
                    </span>
                  )}
                </td>
                <td>
                  <span className="lib__state">
                    <span
                      className="lib__dot"
                      style={{ background: `var(${STATE_TOKEN[row.state]})` }}
                    />
                    {STATE_LABEL[row.state]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <p className="lib__empty">Ningún ítem cumple el filtro.</p>}
    </section>
  );
}
