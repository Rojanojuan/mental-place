import { useLiveQuery } from 'dexie-react-hooks';
import { BodyMap } from '@/components/BodyMap';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { ID, LocusState } from '@/domain/types';
import {
  countsFor,
  db,
  forecast,
  listLoci,
  listPalaces,
  listZones,
  statusByLocus,
  studyStreak,
} from '@/db';
import './stats.css';

const ORDER: LocusState[] = ['due', 'learning', 'new', 'review', 'mastered', 'suspended', 'empty'];
const FORECAST_DAYS = 30;

/** Calendario y estadísticas: previsión, reparto por estado y retención por zona. */
export function Stats() {
  const data = useLiveQuery(async () => {
    const now = new Date();
    const palace = (await listPalaces())[0];
    if (!palace) return undefined;

    const [loci, zones, statuses, days, counts, streak, logs] = await Promise.all([
      listLoci(palace.id),
      listZones(palace.id),
      statusByLocus(palace.id, now),
      forecast(FORECAST_DAYS, now),
      countsFor({ scope: 'today' }, now),
      studyStreak(now),
      db.reviewLogs.toArray(),
    ]);

    // Reparto de los puntos por estado.
    const byState = new Map<LocusState, number>();
    for (const state of Object.values(statuses)) {
      byState.set(state, (byState.get(state) ?? 0) + 1);
    }

    // Retención: qué parte de los repasos de cada zona no fueron «otra vez».
    const locusByItem = new Map<ID, ID>();
    for (const item of await db.items.toArray()) {
      if (item.locusId !== null) locusByItem.set(item.id, item.locusId);
    }
    const zoneOfLocus = new Map(loci.map((locus) => [locus.id, locus.zoneId]));
    const perZone = new Map<string, { total: number; ok: number }>();
    for (const log of logs) {
      const locusId = locusByItem.get(log.itemId);
      const zoneId = locusId === undefined ? undefined : zoneOfLocus.get(locusId);
      if (zoneId === undefined) continue;
      const bucket = perZone.get(zoneId) ?? { total: 0, ok: 0 };
      bucket.total += 1;
      if (log.grade !== 'again') bucket.ok += 1;
      perZone.set(zoneId, bucket);
    }

    return {
      palace,
      loci,
      zones,
      statuses,
      days,
      counts,
      streak,
      byState,
      perZone,
      total: logs.length,
    };
  }, []);

  if (!data) {
    return (
      <section className="stats stats--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
      </section>
    );
  }

  const peak = Math.max(1, ...data.days.map((day) => day.count));
  const totalLoci = data.loci.length;

  return (
    <section className="stats">
      <h2>Calendario y estadísticas</h2>
      <p className="stats__sub">
        {data.total} {data.total === 1 ? 'repaso registrado' : 'repasos registrados'} ·{' '}
        {data.streak > 0 ? `racha de ${String(data.streak)} días` : 'sin racha activa'}
      </p>

      <div className="stats__grid">
        <article className="stats__panel stats__wide">
          <h3>Previsión de {FORECAST_DAYS} días</h3>
          <ol
            className="stats__forecast"
            aria-label={`Repasos previstos para ${String(FORECAST_DAYS)} días`}
          >
            {data.days.map((day) => (
              <li key={day.date} title={`${day.date}: ${String(day.count)}`}>
                <span
                  className="stats__bar"
                  style={{ height: `${String(Math.round((day.count / peak) * 100))}%` }}
                />
              </li>
            ))}
          </ol>
          <p className="stats__hint">
            Máximo en un día: <strong>{peak}</strong> · hoy vencen{' '}
            <strong>{data.counts.due}</strong>
          </p>
        </article>

        <article className="stats__panel">
          <h3>Reparto de los puntos</h3>
          <ul className="stats__states">
            {ORDER.filter((state) => (data.byState.get(state) ?? 0) > 0).map((state) => {
              const count = data.byState.get(state) ?? 0;
              return (
                <li key={state}>
                  <span
                    className="stats__sdot"
                    style={{ background: `var(${STATE_TOKEN[state]})` }}
                  />
                  <span className="stats__slabel">{STATE_LABEL[state]}</span>
                  <span className="stats__sbar">
                    <span
                      style={{
                        width: `${String(Math.round((count / Math.max(1, totalLoci)) * 100))}%`,
                        background: `var(${STATE_TOKEN[state]})`,
                      }}
                    />
                  </span>
                  <span className="stats__snum mono">{count}</span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="stats__panel">
          <h3>Retención por zona</h3>
          {data.perZone.size === 0 ? (
            <p className="stats__hint">Todavía no hay repasos suficientes.</p>
          ) : (
            <ul className="stats__zones">
              {data.zones.map((zone) => {
                const bucket = data.perZone.get(zone.id);
                if (!bucket) return null;
                const pct = Math.round((bucket.ok / bucket.total) * 100);
                return (
                  <li key={zone.id}>
                    <span className="stats__zname">{zone.name}</span>
                    <span className="stats__sbar">
                      <span
                        style={{
                          width: `${String(pct)}%`,
                          background: `var(--zone-${zone.color})`,
                        }}
                      />
                    </span>
                    <span className="stats__snum mono">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="stats__panel">
          <h3>Cuerpo de calor</h3>
          <BodyMap
            loci={data.loci}
            statusByLocus={data.statuses}
            appearance={data.palace.style}
            maxHeight="44dvh"
            label="Mapa del palacio por estado"
          />
        </article>
      </div>
    </section>
  );
}
