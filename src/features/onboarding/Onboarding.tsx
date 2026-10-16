import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { countsFor, listLoci, listPalaces, listSchedules, setSetting, statusByLocus } from '@/db';
import { formatInterval } from '@/srs';
import './onboarding.css';

const STEPS = ['Qué es esto', 'Tu palacio', 'Tu ritmo', 'El primer repaso'] as const;

/** Onboarding en cuatro pasos (contrato / diseño `Onboarding.dc.html`). */
export function Onboarding() {
  const [step, setStep] = useState(0);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    const now = new Date();
    const [palaces, schedules] = await Promise.all([listPalaces(), listSchedules()]);
    const palace = palaces[0];
    const [loci, statuses, counts] = palace
      ? await Promise.all([
          listLoci(palace.id),
          statusByLocus(palace.id, now),
          countsFor({ scope: 'today' }, now),
        ])
      : [[], {}, { due: 0, new: 0, mastered: 0, suspended: 0 }];
    return { palaces, schedules, palace, loci, statuses, counts };
  }, []);

  if (!data) {
    return (
      <section className="onb onb--msg">
        <p className="insp__shimmer">Preparando…</p>
      </section>
    );
  }

  const finish = async (): Promise<void> => {
    await setSetting('onboarded', true);
    if (scheduleId !== null) await setSetting('defaultScheduleId', scheduleId);
    await navigate('/sesion');
  };

  const chosen = data.schedules.find((entry) => entry.id === (scheduleId ?? 'sch-r10'));

  return (
    <section className="onb">
      <ol className="onb__steps" aria-label="Pasos">
        {STEPS.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            <span className={`onb__dot${index <= step ? ' is-done' : ''}`} />
            {label}
          </li>
        ))}
      </ol>

      <article className="onb__card">
        {step === 0 && (
          <>
            <h2>Un palacio de la memoria sobre tu cuerpo</h2>
            <p>
              Cada parte del cuerpo es un <strong>punto</strong>, y cada punto guarda algo que
              quieres recordar. Al repasar, la app te señala el punto y tú intentas recordar qué hay
              ahí antes de revelarlo.
            </p>
            <p>
              Funciona porque recordar un lugar es mucho más fácil que recordar un dato suelto: el
              cuerpo te da 45 ganchos que ya conoces de memoria.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Tu palacio</h2>
            {data.palace ? (
              <>
                <p>
                  Ya tienes <strong>{data.palace.name}</strong> con {data.loci.length} puntos. Los
                  colores dicen en qué estado está cada uno: gris sin contenido, azul por estudiar.
                </p>
                <div className="onb__map">
                  <BodyMap
                    loci={data.loci}
                    statusByLocus={data.statuses}
                    maxHeight="40dvh"
                    label="Tu palacio"
                  />
                </div>
              </>
            ) : (
              <p>
                Todavía no hay ningún palacio. Puedes importar uno desde{' '}
                <Link to="/datos">Datos</Link> o crearlo en el <Link to="/editor">Editor</Link>.
              </p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2>Tu ritmo</h2>
            <p>
              Un horario decide cuándo vuelve cada tarjeta. Si no sabes cuál elegir, deja{' '}
              <strong>R10</strong>: va de diez minutos a un año en diez pasos.
            </p>
            <ul className="onb__schedules">
              {data.schedules.map((schedule) => (
                <li key={schedule.id}>
                  <label>
                    <input
                      type="radio"
                      name="schedule"
                      value={schedule.id}
                      checked={(scheduleId ?? 'sch-r10') === schedule.id}
                      onChange={() => {
                        setScheduleId(schedule.id);
                      }}
                    />
                    <span className="onb__sname">{schedule.name}</span>
                    <span className="onb__sintervals mono">
                      {schedule.intervals
                        .slice(0, 5)
                        .map((interval) => formatInterval(interval))
                        .join(' · ')}
                      {schedule.intervals.length > 5 ? ' …' : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {chosen && (
              <p className="onb__hint">
                Los repasos de un día o más caerán a las {chosen.rules.dayStartHour}:00. Se puede
                cambiar en <Link to="/horarios">Horarios</Link>.
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2>El primer repaso</h2>
            <p>
              Tienes <strong>{data.counts.new + data.counts.due}</strong> tarjetas esperando. En la
              sesión:
            </p>
            <ol className="onb__howto">
              <li>Verás el punto señalado en el cuerpo. Intenta recordar qué guarda.</li>
              <li>
                Pulsa <kbd>espacio</kbd> para revelar la escena, y otra vez para el contenido.
              </li>
              <li>
                Califica con <kbd>1</kbd>–<kbd>4</kbd>: otra vez, difícil, bien, fácil.
              </li>
              <li>Verás cuándo vuelve. Si no te cuadra, «Avanzado» te deja ponerle otra fecha.</li>
            </ol>
          </>
        )}

        <footer className="onb__nav">
          {step > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStep((value) => value - 1);
              }}
            >
              Atrás
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setStep((value) => value + 1);
              }}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                void finish();
              }}
            >
              Empezar a repasar
            </button>
          )}
        </footer>
      </article>
    </section>
  );
}
