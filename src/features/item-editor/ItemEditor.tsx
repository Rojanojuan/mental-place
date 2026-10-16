import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Block, Item } from '@/domain/types';
import {
  db,
  getItem,
  listLoci,
  listPalaces,
  listTemplates,
  listZones,
  putItem,
  removeItem,
  stamp,
} from '@/db';
import { BlockView } from '@/features/inspector/BlockView';
import { BlockEditor } from './BlockEditor';
import { BLOCK_LABEL, emptyBlock } from './blocks';
import './item-editor.css';

const BLOCK_TYPES = Object.keys(BLOCK_LABEL) as Block['type'][];

/**
 * Editor de ítem por bloques, con asignación visual palacio → zona → punto y
 * vista previa de lo que verá en la sesión.
 */
export function ItemEditor() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Item | null>(null);
  const [saved, setSaved] = useState(false);

  const data = useLiveQuery(async () => {
    const [palaces, templates] = await Promise.all([listPalaces(), listTemplates()]);
    const stored = itemId === undefined ? undefined : await getItem(itemId);
    const locus = stored?.locusId === null ? undefined : await db.loci.get(stored?.locusId ?? '');
    const palaceId = locus?.palaceId ?? palaces[0]?.id;
    const [loci, zones] =
      palaceId === undefined
        ? [[], []]
        : await Promise.all([listLoci(palaceId), listZones(palaceId)]);
    return { palaces, templates, stored, loci, zones, palaceId };
  }, [itemId]);

  if (!data) {
    return (
      <section className="ite ite--msg">
        <p className="insp__shimmer">Abriendo el ítem…</p>
      </section>
    );
  }

  if (!data.stored) {
    return (
      <section className="ite ite--msg">
        <h2>Ese ítem no existe</h2>
        <Link className="btn" to="/biblioteca">
          Volver a la biblioteca
        </Link>
      </section>
    );
  }

  const item = draft ?? data.stored;

  const edit = (change: (item: Item) => Item): void => {
    setDraft(change(structuredClone(item)));
    setSaved(false);
  };

  const save = async (): Promise<void> => {
    if (!draft) return;
    await putItem({ ...draft, updatedAt: stamp() });
    setDraft(null);
    setSaved(true);
  };

  const destroy = async (): Promise<void> => {
    await removeItem(item.id);
    await navigate('/biblioteca');
  };

  return (
    <section className="ite">
      <header className="ite__head">
        <div>
          <h2>Editar ítem</h2>
          <p className="ite__sub mono">{item.id}</p>
        </div>
        <div className="ite__actions">
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
            <span className="ite__saved" role="status">
              Guardado
            </span>
          )}
          <button
            type="button"
            className="btn ite__danger"
            onClick={() => {
              void destroy();
            }}
          >
            Borrar
          </button>
        </div>
      </header>

      <div className="ite__grid">
        <div className="ite__form">
          <label className="blke__field">
            <span>Título</span>
            <input
              type="text"
              value={item.title}
              onChange={(event) => {
                edit((current) => ({ ...current, title: event.target.value }));
              }}
            />
          </label>

          <label className="blke__field">
            <span>Frente — la pregunta o la pista</span>
            <textarea
              rows={2}
              value={item.front ?? ''}
              onChange={(event) => {
                const front = event.target.value;
                edit((current) => {
                  if (front === '') {
                    const { front: _drop, ...rest } = current;
                    return rest;
                  }
                  return { ...current, front };
                });
              }}
            />
          </label>

          <label className="blke__field">
            <span>Reverso — la respuesta</span>
            <textarea
              rows={2}
              value={item.back ?? ''}
              onChange={(event) => {
                const back = event.target.value;
                edit((current) => {
                  if (back === '') {
                    const { back: _drop, ...rest } = current;
                    return rest;
                  }
                  return { ...current, back };
                });
              }}
            />
          </label>

          <div className="ite__row">
            <label className="blke__field">
              <span>Plantilla</span>
              <select
                value={item.templateId}
                onChange={(event) => {
                  edit((current) => ({ ...current, templateId: event.target.value }));
                }}
              >
                {data.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="blke__field">
              <span>Etiquetas — separadas por comas</span>
              <input
                type="text"
                value={item.tags.join(', ')}
                onChange={(event) => {
                  const tags = event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag !== '');
                  edit((current) => ({ ...current, tags }));
                }}
              />
            </label>
          </div>

          <label className="blke__field">
            <span>Punto del palacio</span>
            <select
              value={item.locusId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                edit((current) => ({ ...current, locusId: value === '' ? null : value }));
              }}
            >
              <option value="">— sin asignar —</option>
              {data.zones.map((zone) => (
                <optgroup key={zone.id} label={zone.name}>
                  {data.loci
                    .filter((locus) => locus.zoneId === zone.id)
                    .map((locus) => (
                      <option key={locus.id} value={locus.id}>
                        {locus.routeNo} · {locus.partName}
                      </option>
                    ))}
                </optgroup>
              ))}
              {data.loci.filter((locus) => locus.zoneId === undefined).length > 0 && (
                <optgroup label="Sin zona">
                  {data.loci
                    .filter((locus) => locus.zoneId === undefined)
                    .map((locus) => (
                      <option key={locus.id} value={locus.id}>
                        {locus.routeNo} · {locus.partName}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </label>

          <h3>Bloques de contenido</h3>
          <ol className="ite__blocks">
            {item.blocks.map((block, index) => (
              <li key={index}>
                <header>
                  <span className="ite__btype">{BLOCK_LABEL[block.type]}</span>
                  <span className="ite__bmove">
                    <button
                      type="button"
                      aria-label={`Subir el bloque ${String(index + 1)}`}
                      disabled={index === 0}
                      onClick={() => {
                        edit((current) => {
                          const blocks = current.blocks;
                          const previous = blocks[index - 1];
                          const self = blocks[index];
                          if (previous && self) {
                            blocks[index - 1] = self;
                            blocks[index] = previous;
                          }
                          return current;
                        });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar el bloque ${String(index + 1)}`}
                      disabled={index === item.blocks.length - 1}
                      onClick={() => {
                        edit((current) => {
                          const blocks = current.blocks;
                          const next = blocks[index + 1];
                          const self = blocks[index];
                          if (next && self) {
                            blocks[index + 1] = self;
                            blocks[index] = next;
                          }
                          return current;
                        });
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar el bloque ${String(index + 1)}`}
                      onClick={() => {
                        edit((current) => {
                          current.blocks.splice(index, 1);
                          return current;
                        });
                      }}
                    >
                      ×
                    </button>
                  </span>
                </header>
                <BlockEditor
                  block={block}
                  index={index}
                  onChange={(next) => {
                    edit((current) => {
                      current.blocks[index] = next;
                      return current;
                    });
                  }}
                />
              </li>
            ))}
          </ol>

          <div className="ite__add">
            {BLOCK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="chip"
                onClick={() => {
                  edit((current) => {
                    current.blocks.push(emptyBlock(type));
                    return current;
                  });
                }}
              >
                + {BLOCK_LABEL[type]}
              </button>
            ))}
          </div>
        </div>

        <aside className="ite__preview">
          <h3>Vista previa</h3>
          <p className="ite__pfront">{item.front ?? item.title}</p>
          {item.back !== undefined && <p className="ite__pback">{item.back}</p>}
          {item.blocks.map((block, index) => (
            <BlockView key={index} block={block} />
          ))}
        </aside>
      </div>
    </section>
  );
}
