import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportBundle, getSetting, importBundle, setSetting } from '@/db';
import {
  type CsvMapping,
  type CsvTable,
  type ImportPlan,
  COLLECTIONS,
  bundleToCsv,
  csvToBundle,
  downloadBackup,
  downloadText,
  backupFilename,
  guessSeparator,
  parseCsv,
  planImport,
  planTotal,
  readCatalog,
  readExistingIds,
  suggestMapping,
} from '@/io';
import {
  type PeriodicState,
  NOTIFY_KEY,
  disablePeriodicReminder,
  enablePeriodicReminder,
  notifyPermission,
  periodicReminderState,
  requestNotifyPermission,
} from '@/features/notifications/notify';
import { getBackup, listBackups } from './autobackup';
import './import-export.css';

const COLLECTION_LABEL: Record<(typeof COLLECTIONS)[number], string> = {
  palaces: 'Palacios',
  zones: 'Zonas',
  loci: 'Puntos',
  sceneObjects: 'Objetos de escena',
  items: 'Ítems',
  decks: 'Mazos',
  templates: 'Plantillas',
  schedules: 'Horarios',
};

const MAP_FIELDS: { key: keyof CsvMapping; label: string }[] = [
  { key: 'title', label: 'Título' },
  { key: 'front', label: 'Frente' },
  { key: 'back', label: 'Reverso' },
  { key: 'locusRef', label: 'Punto' },
  { key: 'tags', label: 'Etiquetas' },
  { key: 'priority', label: 'Prioridad' },
  { key: 'notes', label: 'Notas' },
];

type Source = { kind: 'json'; raw: unknown } | { kind: 'csv'; table: CsvTable };

/**
 * Importar y exportar en el formato JSON v1 del contrato.
 *
 * Nada se escribe sin pasar por la vista previa: `planImport()` valida con Zod,
 * cuenta qué se crea y qué se sobrescribe y resuelve las referencias por
 * nombre, y solo entonces aparece el botón de confirmar.
 */
export function ImportExport() {
  const [source, setSource] = useState<Source | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reset = (): void => {
    setSource(null);
    setMapping({});
    setPlan(null);
    setApplied(null);
    setProblem(null);
  };

  async function preview(next: Source, nextMapping: CsvMapping): Promise<void> {
    const [catalog, existing] = await Promise.all([readCatalog(), readExistingIds()]);
    const raw =
      next.kind === 'json'
        ? next.raw
        : csvToBundle(next.table, nextMapping, { templateId: 'tpl-libre' });
    setPlan(planImport(raw, catalog, existing));
  }

  async function onFile(file: File): Promise<void> {
    reset();
    const text = await file.text();
    try {
      if (file.name.toLowerCase().endsWith('.csv') || !text.trimStart().startsWith('{')) {
        const table = parseCsv(text, guessSeparator(text));
        const suggested = suggestMapping(table.headers);
        const next: Source = { kind: 'csv', table };
        setSource(next);
        setMapping(suggested);
        await preview(next, suggested);
      } else {
        const next: Source = { kind: 'json', raw: JSON.parse(text) as unknown };
        setSource(next);
        await preview(next, {});
      }
    } catch (cause: unknown) {
      setProblem(cause instanceof Error ? cause.message : 'No se pudo leer el archivo');
    }
  }

  async function changeMapping(key: keyof CsvMapping, value: string): Promise<void> {
    if (source?.kind !== 'csv') return;
    // Se reconstruye sin la clave en vez de borrarla: con
    // `exactOptionalPropertyTypes` no vale dejarla valiendo `undefined`.
    const next = Object.fromEntries(
      Object.entries(mapping).filter(([field]) => field !== key),
    ) as CsvMapping;
    if (value !== '') next[key] = Number(value);
    setMapping(next);
    await preview(source, next);
  }

  async function confirm(): Promise<void> {
    if (!plan?.bundle) return;
    const counts = await importBundle(plan.bundle);
    const total = COLLECTIONS.reduce((sum, name) => sum + counts[name], 0);
    setApplied(`${String(total)} ${total === 1 ? 'registro importado' : 'registros importados'}.`);
    setPlan(null);
    setSource(null);
  }

  async function exportJson(): Promise<void> {
    downloadBackup(await exportBundle());
  }

  async function exportCsv(): Promise<void> {
    downloadText(bundleToCsv(await exportBundle()), backupFilename(new Date(), 'csv'), 'text/csv');
  }

  const totals = plan ? planTotal(plan) : null;
  const backups = useLiveQuery(() => listBackups(), []);
  const notifyOn = useLiveQuery(() => getSetting(NOTIFY_KEY, false), []);
  const permission = notifyPermission();
  // El aviso en segundo plano no vive en la base de datos: lo sabe el
  // navegador, y solo responde si la app esta instalada.
  const [periodic, setPeriodic] = useState<PeriodicState | null>(null);
  useEffect(() => {
    void periodicReminderState().then(setPeriodic);
  }, []);

  return (
    <section className="iox">
      <h2>Importar y exportar</h2>
      <p className="iox__sub">
        Formato JSON v1 del contrato. Se admite un paquete parcial: por ejemplo solo ítems, con el
        punto indicado por nombre («Cuerpo 1 · L8», «Casa familiar · 37»).
      </p>

      <div className="iox__grid">
        <article className="iox__panel">
          <h3>Importar</h3>
          <label className="iox__file">
            <span>Elegir archivo JSON o CSV</span>
            <input
              type="file"
              accept=".json,.csv,.tsv,text/csv,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>

          {problem !== null && (
            <p className="iox__error" role="alert">
              {problem}
            </p>
          )}
          {applied !== null && (
            <p className="iox__ok" role="status">
              {applied}
            </p>
          )}

          {source?.kind === 'csv' && (
            <div className="iox__mapping">
              <h4>Mapeo de columnas</h4>
              <p className="iox__hint">
                {source.table.rows.length}{' '}
                {source.table.rows.length === 1 ? 'fila leída' : 'filas leídas'}.
              </p>
              {MAP_FIELDS.map((field) => (
                <label key={field.key} className="iox__maprow">
                  <span>{field.label}</span>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(event) => {
                      void changeMapping(field.key, event.target.value);
                    }}
                  >
                    <option value="">— sin usar —</option>
                    {source.table.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          {plan && (
            <div className="iox__plan">
              <h4>Vista previa</h4>
              {plan.ok ? (
                <>
                  <p className="iox__totals">
                    <strong>{totals?.create ?? 0}</strong> por crear ·{' '}
                    <strong>{totals?.update ?? 0}</strong> por sobrescribir
                  </p>
                  <table className="iox__diff">
                    <thead>
                      <tr>
                        <th scope="col">Colección</th>
                        <th scope="col">Crear</th>
                        <th scope="col">Sobrescribir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLLECTIONS.filter(
                        (name) => plan.diff[name].create + plan.diff[name].update > 0,
                      ).map((name) => (
                        <tr key={name}>
                          <td>{COLLECTION_LABEL[name]}</td>
                          <td className="mono">{plan.diff[name].create}</td>
                          <td className="mono">{plan.diff[name].update}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {plan.warnings.length > 0 && (
                    <ul className="iox__warnings">
                      {plan.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  )}

                  {plan.unresolved.length > 0 && (
                    <>
                      <h4>Puntos sin resolver</h4>
                      <ul className="iox__unresolved">
                        {plan.unresolved.map((entry, i) => (
                          <li key={i}>
                            <strong>{entry.title}</strong> → «{entry.ref}»{' '}
                            {entry.reason === 'ambiguous'
                              ? `(ambiguo: ${entry.candidates?.join(', ') ?? ''})`
                              : '(no encontrado)'}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      void confirm();
                    }}
                  >
                    Importar
                  </button>
                </>
              ) : (
                <>
                  <p className="iox__error" role="alert">
                    El archivo no cumple el formato. No se importó nada.
                  </p>
                  <ul className="iox__errors">
                    {plan.errors.slice(0, 20).map((error, i) => (
                      <li key={i}>
                        <code>{error.path}</code> — {error.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" className="iox__cancel" onClick={reset}>
                Cancelar
              </button>
            </div>
          )}
        </article>

        <article className="iox__panel">
          <h3>Exportar</h3>
          <p className="iox__hint">
            La copia de seguridad lleva todo: palacios, zonas, puntos, objetos de escena, ítems,
            mazos, plantillas y horarios.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              void exportJson();
            }}
          >
            Copia de seguridad (JSON)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void exportCsv();
            }}
          >
            Ítems en CSV
          </button>

          <h3>Copias automáticas</h3>
          <p className="iox__hint">
            Una al día, las cinco últimas, guardadas dentro de la app. Si borras los datos del sitio
            se van con ellos, así que de vez en cuando bájate una.
          </p>
          {backups === undefined || backups.length === 0 ? (
            <p className="iox__hint">Todavía no hay ninguna.</p>
          ) : (
            <ul className="iox__backups">
              {backups.map((backup) => (
                <li key={backup.at}>
                  <span className="mono">{backup.at.slice(0, 16).replace('T', ' ')}</span>
                  <span className="iox__size mono">{Math.round(backup.bytes / 1024)} kB</span>
                  <button
                    type="button"
                    aria-label={`Descargar la copia del ${backup.at.slice(0, 10)}`}
                    onClick={() => {
                      void getBackup(backup.at).then((full) => {
                        if (full) downloadText(full.json, backupFilename(new Date(full.at)));
                      });
                    }}
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3>Avisos de repasos vencidos</h3>
          {permission === 'unsupported' ? (
            <p className="iox__hint">Este navegador no admite notificaciones.</p>
          ) : permission === 'denied' ? (
            <p className="iox__hint">
              Las bloqueaste en el navegador. Hay que permitirlas desde sus ajustes del sitio.
            </p>
          ) : permission === 'granted' ? (
            <label className="iox__toggle">
              <input
                type="checkbox"
                checked={notifyOn ?? false}
                onChange={(event) => {
                  void setSetting(NOTIFY_KEY, event.target.checked);
                }}
              />
              Avisarme cuando haya repasos vencidos
            </label>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => {
                void requestNotifyPermission();
              }}
            >
              Permitir avisos
            </button>
          )}
          <p className="iox__hint">
            Se comprueba al abrir la app y al volver a ella, con cuatro horas de descanso entre
            avisos.
          </p>

          {permission === 'granted' && (
            <>
              <h3>Avisarme con la app cerrada</h3>
              {periodic === 'unsupported' ? (
                <p className="iox__hint">
                  Este navegador no lo admite. Funciona en Chrome o Edge, con la app instalada desde
                  el menu «Instalar app».
                </p>
              ) : periodic === 'on' ? (
                <>
                  <p className="iox__hint">
                    Activo. El navegador elige el momento: como mucho mira cada doce horas, y solo
                    avisa si hay algo vencido.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      void disablePeriodicReminder().then(setPeriodic);
                    }}
                  >
                    Desactivar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      void enablePeriodicReminder().then(setPeriodic);
                    }}
                  >
                    Activar avisos en segundo plano
                  </button>
                  {periodic === 'blocked' && (
                    <p className="iox__hint">
                      El navegador lo ha rechazado. Hay que instalar la app (menu del navegador →
                      «Instalar app») y usarla unos dias: Chrome solo lo concede a las apps
                      instaladas que se abren con frecuencia.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}
