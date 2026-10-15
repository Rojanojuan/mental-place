import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { NumberField } from '@/components/NumberField';
import type { Interval, Schedule, Unit } from '@/domain/types';
import { listSchedules, putSchedule } from '@/db';
import { PRESETS, formatInterval, projectIntervals } from '@/srs';
import { formatDueAt } from '@/features/session/format';
import './schedules.css';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'min', label: 'minutos' },
  { value: 'h', label: 'horas' },
  { value: 'd', label: 'días' },
  { value: 'w', label: 'semanas' },
  { value: 'mo', label: 'meses' },
];

const AGAIN_LABEL: Record<Schedule['rules']['againAction'], string> = {
  reset: 'Volver a la etapa 1',
  back1: 'Retroceder una etapa',
  back2: 'Retroceder dos etapas',
};

/**
 * Horarios de repaso: los presets del contrato y los del usuario, con el
 * editor de intervalos y la vista de las fechas que saldrían.
 *
 * Los presets son editables, como dice el contrato («R10, 10 checkpoints,
 * editable»). Lo que se guarda afecta a los ítems que usan ese horario.
 */
export function Schedules() {
  // En el orden del contrato: R10 primero, porque es el horario por defecto.
  const order = new Map(PRESETS.map((preset, index) => [preset.id, index]));
  const schedules = useLiveQuery(
    async () =>
      (await listSchedules()).sort(
        (a, b) =>
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'es'),
      ),
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Schedule | null>(null);
  const [saved, setSaved] = useState(false);

  if (!schedules) {
    return (
      <section className="sch sch--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
      </section>
    );
  }

  const current = draft ?? schedules.find((s) => s.id === (selectedId ?? schedules[0]?.id));

  const select = (schedule: Schedule): void => {
    setSelectedId(schedule.id);
    setDraft(null);
    setSaved(false);
  };

  const edit = (change: (schedule: Schedule) => Schedule): void => {
    if (!current) return;
    setDraft(change(structuredClone(current)));
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    if (!draft) return;
    await putSchedule(draft);
    setDraft(null);
    setSaved(true);
  };

  const projection = current
    ? projectIntervals(current.intervals, new Date(), current.rules.dayStartHour)
    : [];

  return (
    <section className="sch">
      <h2>Horarios de repaso</h2>
      <p className="sch__sub">
        Cada mazo usa un horario. Editar uno cambia los próximos repasos de los ítems que lo usan;
        las etapas en las que ya están no se mueven.
      </p>

      <div className="sch__grid">
        <nav className="sch__list" aria-label="Horarios">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              type="button"
              className={`sch__item${schedule.id === current?.id ? ' is-sel' : ''}`}
              onClick={() => {
                select(schedule);
              }}
            >
              <span className="sch__name">{schedule.name}</span>
              <span className="sch__meta mono">
                {schedule.mode === 'adaptive'
                  ? 'adaptativo'
                  : `${String(schedule.intervals.length)} etapas`}
              </span>
            </button>
          ))}
        </nav>

        {current && (
          <article className="sch__editor">
            <header className="sch__head">
              <h3>{current.name}</h3>
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
                <span className="sch__saved" role="status">
                  Guardado
                </span>
              )}
            </header>

            <h4>Intervalos</h4>
            {current.mode === 'adaptive' ? (
              <p className="sch__hint">
                En modo adaptativo los intervalos se calculan solos con la facilidad de cada ítem;
                los dos primeros sirven de punto de partida.
              </p>
            ) : null}
            <ol className="sch__intervals">
              {current.intervals.map((interval, index) => (
                <li key={index}>
                  <span className="sch__stage mono">{index + 1}</span>
                  <NumberField
                    className="sch__value"
                    label={`Valor de la etapa ${String(index + 1)}`}
                    min={1}
                    value={interval.value}
                    onCommit={(value) => {
                      edit((schedule) => {
                        const next = schedule.intervals[index];
                        if (next) next.value = value;
                        return schedule;
                      });
                    }}
                  />
                  <select
                    className="sch__unit"
                    aria-label={`Unidad de la etapa ${String(index + 1)}`}
                    value={interval.unit}
                    onChange={(event) => {
                      const unit = event.target.value as Unit;
                      edit((schedule) => {
                        const next = schedule.intervals[index];
                        if (next) next.unit = unit;
                        return schedule;
                      });
                    }}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <span className="sch__when">
                    {formatDueAt(projection[index]?.at ?? new Date())}
                  </span>
                  <button
                    type="button"
                    className="sch__remove"
                    aria-label={`Quitar la etapa ${String(index + 1)}`}
                    disabled={current.intervals.length <= 1}
                    onClick={() => {
                      edit((schedule) => {
                        schedule.intervals.splice(index, 1);
                        return schedule;
                      });
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn sch__add"
              onClick={() => {
                edit((schedule) => {
                  const last: Interval = schedule.intervals.at(-1) ?? { value: 1, unit: 'd' };
                  schedule.intervals.push({ value: last.value * 2, unit: last.unit });
                  return schedule;
                });
              }}
            >
              Añadir etapa
            </button>

            <h4>Reglas de calificación</h4>
            <div className="sch__rules">
              <label>
                <span>«Otra vez» hace</span>
                <select
                  value={current.rules.againAction}
                  onChange={(event) => {
                    const action = event.target.value as Schedule['rules']['againAction'];
                    edit((schedule) => {
                      schedule.rules.againAction = action;
                      return schedule;
                    });
                  }}
                >
                  {Object.entries(AGAIN_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>«Difícil» multiplica por</span>
                <NumberField
                  label="«Difícil» multiplica por"
                  step={0.05}
                  min={0.05}
                  max={1}
                  value={current.rules.hardFactor}
                  onCommit={(factor) => {
                    edit((schedule) => {
                      schedule.rules.hardFactor = factor;
                      return schedule;
                    });
                  }}
                />
              </label>

              <label>
                <span>«Fácil» avanza</span>
                <NumberField
                  label="«Fácil» avanza"
                  min={1}
                  max={5}
                  value={current.rules.easySkip}
                  onCommit={(skip) => {
                    edit((schedule) => {
                      schedule.rules.easySkip = Math.trunc(skip);
                      return schedule;
                    });
                  }}
                />
              </label>

              <label>
                <span>Hora preferida</span>
                <NumberField
                  label="Hora preferida"
                  min={0}
                  max={23}
                  value={current.rules.dayStartHour}
                  onCommit={(hour) => {
                    edit((schedule) => {
                      schedule.rules.dayStartHour = Math.trunc(hour);
                      return schedule;
                    });
                  }}
                />
              </label>

              <label>
                <span>Intervalo mínimo</span>
                <span className="sch__min">
                  <NumberField
                    label="Valor del intervalo mínimo"
                    min={1}
                    value={current.rules.minInterval.value}
                    onCommit={(value) => {
                      edit((schedule) => {
                        schedule.rules.minInterval.value = value;
                        return schedule;
                      });
                    }}
                  />
                  <select
                    aria-label="Unidad del intervalo mínimo"
                    value={current.rules.minInterval.unit}
                    onChange={(event) => {
                      const unit = event.target.value as Unit;
                      edit((schedule) => {
                        schedule.rules.minInterval.unit = unit;
                        return schedule;
                      });
                    }}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>

            <p className="sch__total">
              Aprobando siempre, el último repaso caería el{' '}
              <strong>{formatDueAt(projection.at(-1)?.at ?? new Date())}</strong> — en total{' '}
              {current.intervals.map((interval) => formatInterval(interval)).join(' · ')}.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
