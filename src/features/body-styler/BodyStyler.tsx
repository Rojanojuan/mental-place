import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BodyMap } from '@/components/BodyMap';
import type { APPLIED_KEYS} from '@/design/body-style';
import { PENDING_KEYS, SKIN_FILL } from '@/design/body-style';
import { PALACE_STYLE_DEFAULTS, type Palace, type PalaceStyle } from '@/domain/types';
import { listLoci, listPalaces, putPalace, statusByLocus, stamp } from '@/db';
import './body-styler.css';

type Key = (typeof APPLIED_KEYS)[number];

const OPTIONS: { key: Key; label: string; values: string[]; names?: string[] }[] = [
  {
    key: 'detail',
    label: 'Detalle',
    values: ['min', 'med', 'full'],
    names: ['Solo contorno', 'Rasgos y articulaciones', 'Con músculos'],
  },
  { key: 'line', label: 'Trazo', values: ['fine', 'bold'], names: ['Fino', 'Grueso'] },
  { key: 'vol', label: 'Volumen', values: ['shade', 'flat'], names: ['Con relleno', 'Plano'] },
  {
    key: 'draw',
    label: 'Dibujo',
    values: ['atlas', 'lapiz', 'neon'],
    names: ['Atlas', 'Lápiz', 'Neón'],
  },
  {
    key: 'accent',
    label: 'Color',
    values: ['cabeza', 'hombros', 'torso', 'brazos', 'piernas'],
    names: ['Cabeza', 'Hombros', 'Torso', 'Brazos', 'Piernas'],
  },
  {
    key: 'skin',
    label: 'Piel',
    values: ['neutral', 'porcelana', 'arena', 'miel', 'canela', 'ebano', 'plano'],
    names: ['Neutral', 'Porcelana', 'Arena', 'Miel', 'Canela', 'Ébano', 'Plano'],
  },
];

/** `lapiz` necesita capas de sombreado rayado que la silueta no trae. */
const NOT_YET = new Set(['lapiz']);

/**
 * Mis cuerpos: la apariencia del palacio, en vivo sobre la silueta.
 *
 * Solo aparecen las claves que la silueta entregada puede representar. Las que
 * necesitan capas que el SVG no tiene (cabello, vello facial, gafas) se listan
 * como pendientes en vez de fingir que funcionan — ver `docs/HANDOFF_DISENO.md` §3.11.
 */
export function BodyStyler() {
  const [draft, setDraft] = useState<Palace | null>(null);
  const [saved, setSaved] = useState(false);

  const data = useLiveQuery(async () => {
    const palaces = await listPalaces();
    const palace = palaces[0];
    if (!palace) return { palaces, palace: undefined };
    const [loci, statuses] = await Promise.all([
      listLoci(palace.id),
      statusByLocus(palace.id, new Date()),
    ]);
    return { palaces, palace, loci, statuses };
  }, []);

  if (!data) {
    return (
      <section className="bst bst--msg">
        <p className="insp__shimmer">Abriendo la base de datos…</p>
      </section>
    );
  }

  if (!data.palace) {
    return (
      <section className="bst bst--msg">
        <h2>Todavía no hay ningún cuerpo</h2>
      </section>
    );
  }

  const palace = draft ?? data.palace;
  const style: PalaceStyle = { ...PALACE_STYLE_DEFAULTS, ...palace.style };

  const set = (key: Key, value: string): void => {
    setDraft({ ...palace, style: { ...style, [key]: value } });
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    if (!draft) return;
    await putPalace({ ...draft, updatedAt: stamp() });
    setDraft(null);
    setSaved(true);
  };

  return (
    <section className="bst">
      <header className="bst__head">
        <div>
          <h2>Mis cuerpos</h2>
          <p className="bst__sub">{palace.name}</p>
        </div>
        <div className="bst__actions">
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
            <span className="bst__saved" role="status">
              Guardado
            </span>
          )}
        </div>
      </header>

      <div className="bst__grid">
        <div className="bst__map">
          <BodyMap
            loci={data.loci}
            statusByLocus={data.statuses}
            appearance={style}
            maxHeight="62dvh"
            label="Vista previa del cuerpo"
          />
        </div>

        <div className="bst__panel">
          {OPTIONS.map((option) => (
            <fieldset key={option.key} className="bst__field">
              <legend>{option.label}</legend>
              <div className="bst__chips">
                {option.values.map((value, index) => {
                  const pending = NOT_YET.has(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`chip${style[option.key] === value ? ' is-sel' : ''}${pending ? ' is-pending' : ''}`}
                      aria-pressed={style[option.key] === value}
                      onClick={() => {
                        set(option.key, value);
                      }}
                    >
                      {option.key === 'skin' && (
                        <span
                          className="bst__swatch"
                          style={{ background: SKIN_FILL[value as PalaceStyle['skin']] }}
                        />
                      )}
                      {option.key === 'accent' && (
                        <span
                          className="bst__swatch"
                          style={{ background: `var(--zone-${value})` }}
                        />
                      )}
                      {option.names?.[index] ?? value}
                      {pending && <span className="bst__soon">pendiente</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <p className="bst__pending">
            <strong>Falta en la silueta:</strong> {PENDING_KEYS.join(', ')}. El SVG del traspaso
            trae cinco capas (orejas, contorno, rasgos, articulaciones y músculos) pero no las de
            cabello, vello facial ni gafas, así que esas opciones no se pueden aplicar todavía.
          </p>
        </div>
      </div>
    </section>
  );
}
