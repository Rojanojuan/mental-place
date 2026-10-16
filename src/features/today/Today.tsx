import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { countsFor, forecast, getCurrentPalace, listLoci, statusByLocus, studyStreak } from '@/db';
import './today.css';

const DAY_LABELS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

function greeting(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Pantalla de Hoy: cuánto hay por repasar, el mapa con los vencidos señalados
 * y la previsión de la semana. El cálculo lo hace el motor; aquí solo se pinta.
 */
export function Today() {
  const data = useLiveQuery(async () => {
    const now = new Date();
    const palace = await getCurrentPalace();
    if (!palace) return undefined;
    const [counts, loci, statuses, days, streak] = await Promise.all([
      countsFor({ scope: 'today' }, now),
      listLoci(palace.id),
      statusByLocus(palace.id, now),
      forecast(7, now),
      studyStreak(now),
    ]);
    return { palace, counts, loci, statuses, days, streak, now };
  }, []);

  if (!data) {
    return (
      <section className="today today--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
      </section>
    );
  }

  const { counts, days, streak } = data;
  const pending = counts.due + counts.new;
  const peak = Math.max(1, ...days.map((d) => d.count));

  return (
    <section className="today">
      <header>
        <h2>{greeting(data.now.getHours())}</h2>
        <p className="today__sub">
          {streak > 0
            ? `${String(streak)} ${streak === 1 ? 'día' : 'días'} seguidos estudiando`
            : 'Empieza hoy tu racha'}
        </p>
      </header>

      <div className="today__grid">
        <div className="today__panel">
          <ul className="today__counts">
            <li>
              <span className="today__n mono" style={{ color: 'var(--state-due)' }}>
                {counts.due}
              </span>
              <span className="today__label">vencidos</span>
            </li>
            <li>
              <span className="today__n mono" style={{ color: 'var(--state-new)' }}>
                {counts.new}
              </span>
              <span className="today__label">nuevos</span>
            </li>
            <li>
              <span className="today__n mono" style={{ color: 'var(--state-mastered)' }}>
                {counts.mastered}
              </span>
              <span className="today__label">dominados</span>
            </li>
          </ul>

          {pending > 0 ? (
            <Link className="btn btn--primary today__cta" to="/sesion">
              Repasar ahora ({pending})
            </Link>
          ) : (
            <p className="today__done">
              Nada pendiente hoy. Puedes hacer un <Link to="/sesion?scope=walk">recorrido</Link>.
            </p>
          )}

          <h3 className="today__h3">Próximos 7 días</h3>
          <ol className="today__forecast" aria-label="Repasos previstos para los próximos 7 días">
            {days.map((day) => {
              const date = new Date(`${day.date}T12:00:00`);
              return (
                <li key={day.date}>
                  <span className="today__bar-wrap">
                    <span
                      className="today__bar"
                      style={{ height: `${String(Math.round((day.count / peak) * 100))}%` }}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="today__bar-n mono">{day.count}</span>
                  <span className="today__bar-d">{DAY_LABELS[date.getDay()]}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="today__map">
          <BodyMap
            loci={data.loci}
            statusByLocus={data.statuses}
            appearance={data.palace.style}
            plan={data.palace.planData}
            maxHeight="56dvh"
            label="Mapa del palacio con los repasos pendientes"
          />
          <p className="today__palace">{data.palace.name}</p>
        </div>
      </div>
    </section>
  );
}
