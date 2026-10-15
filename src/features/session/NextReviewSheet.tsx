import { useState } from 'react';
import type { Grade, Schedule } from '@/domain/types';
import { type OverrideTarget, formatInterval, shortcuts } from '@/srs';
import { formatDueAt } from './format';
import './session.css';

const GRADE_LABEL: Record<Grade, string> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil',
};

export interface NextReviewSheetProps {
  grade: Grade;
  proposedDueAt: Date;
  stage: number;
  mastered: boolean;
  schedule: Schedule;
  now: Date;
  onAccept: () => void;
  onOverride: (target: OverrideTarget) => void;
}

/** Para `<input type="datetime-local">`, que quiere hora local sin zona. */
function toLocalInput(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * La hoja del próximo repaso (contrato §4.3). **Aceptar es la acción
 * principal**; los ajustes viven detrás de «Avanzado», como fijó el diseño.
 */
export function NextReviewSheet({
  grade,
  proposedDueAt,
  stage,
  mastered,
  schedule,
  now,
  onAccept,
  onOverride,
}: NextReviewSheetProps) {
  const [advanced, setAdvanced] = useState(false);
  const [exact, setExact] = useState(() => toLocalInput(proposedDueAt));

  const total = schedule.intervals.length;

  return (
    <section className="sheet" role="dialog" aria-label="Próximo repaso">
      <p className="sheet__grade">{GRADE_LABEL[grade]}</p>
      <p className="sheet__when">
        Próximo repaso: <strong>{formatDueAt(proposedDueAt)}</strong>
      </p>
      <p className="sheet__stage mono">
        {mastered ? `dominado · repaso opcional` : `etapa ${String(stage)}/${String(total)}`}
      </p>

      <button type="button" className="btn btn--primary sheet__accept" onClick={onAccept} autoFocus>
        Aceptar
      </button>

      <button
        type="button"
        className="sheet__toggle"
        aria-expanded={advanced}
        onClick={() => {
          setAdvanced((value) => !value);
        }}
      >
        {advanced ? 'Ocultar opciones' : 'Avanzado'}
      </button>

      {advanced && (
        <div className="sheet__adv">
          <h4>Atajos</h4>
          <div className="sheet__chips">
            {shortcuts(now, schedule.rules.dayStartHour).map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                className="chip"
                onClick={() => {
                  onOverride({ at: shortcut.at });
                }}
              >
                {shortcut.label}
              </button>
            ))}
          </div>

          <h4>Fecha y hora exactas</h4>
          <div className="sheet__row">
            <input
              type="datetime-local"
              className="sheet__input"
              aria-label="Fecha y hora del próximo repaso"
              value={exact}
              onChange={(event) => {
                setExact(event.target.value);
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                const parsed = new Date(exact);
                if (!Number.isNaN(parsed.getTime())) onOverride({ at: parsed });
              }}
            >
              Fijar
            </button>
          </div>

          <h4>Saltar a una etapa</h4>
          <div className="sheet__chips">
            {schedule.intervals.map((interval, index) => (
              <button
                key={index}
                type="button"
                className={`chip${index + 1 === stage ? ' is-sel' : ''}`}
                onClick={() => {
                  onOverride({ stage: index + 1 });
                }}
              >
                {index + 1} · {formatInterval(interval)}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
