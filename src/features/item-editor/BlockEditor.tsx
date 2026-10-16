import type { Block } from '@/domain/types';
import { TableBlockEditor } from './TableBlockEditor';
import './item-editor.css';

export interface BlockEditorProps {
  block: Block;
  index: number;
  onChange: (block: Block) => void;
}

/** Formulario de un bloque, según su tipo. */
export function BlockEditor({ block, index, onChange }: BlockEditorProps) {
  const id = (field: string): string => `blk-${String(index)}-${field}`;

  switch (block.type) {
    case 'text':
    case 'note':
      return (
        <label className="blke__field">
          <span>{block.type === 'note' ? 'Nota' : 'Texto'} (admite **negrita**)</span>
          <textarea
            id={id('md')}
            rows={3}
            value={block.md}
            onChange={(event) => {
              onChange({ type: block.type, md: event.target.value });
            }}
          />
        </label>
      );

    case 'list':
      return (
        <label className="blke__field">
          <span>Lista — un elemento por línea</span>
          <textarea
            id={id('items')}
            rows={4}
            value={block.items.join('\n')}
            onChange={(event) => {
              onChange({
                type: 'list',
                items: event.target.value.split('\n').filter((line) => line.trim() !== ''),
              });
            }}
          />
        </label>
      );

    case 'table':
      return <TableBlockEditor block={block} index={index} onChange={onChange} />;

    case 'bilingual':
      return (
        <div className="blke__pair">
          <label className="blke__field">
            <span>Inglés</span>
            <input
              id={id('en')}
              type="text"
              value={block.en}
              onChange={(event) => {
                onChange({ ...block, en: event.target.value });
              }}
            />
          </label>
          <label className="blke__field">
            <span>Español</span>
            <input
              id={id('es')}
              type="text"
              value={block.es}
              onChange={(event) => {
                onChange({ ...block, es: event.target.value });
              }}
            />
          </label>
        </div>
      );

    case 'error':
      return (
        <div className="blke__pair">
          <label className="blke__field">
            <span>Incorrecto</span>
            <input
              id={id('wrong')}
              type="text"
              value={block.wrong}
              onChange={(event) => {
                onChange({ ...block, wrong: event.target.value });
              }}
            />
          </label>
          <label className="blke__field">
            <span>Correcto</span>
            <input
              id={id('right')}
              type="text"
              value={block.right}
              onChange={(event) => {
                onChange({ ...block, right: event.target.value });
              }}
            />
          </label>
          <label className="blke__field">
            <span>Por qué</span>
            <input
              id={id('why')}
              type="text"
              value={block.why ?? ''}
              onChange={(event) => {
                const why = event.target.value;
                onChange(
                  why === ''
                    ? { type: 'error', wrong: block.wrong, right: block.right }
                    : { ...block, why },
                );
              }}
            />
          </label>
        </div>
      );

    case 'image':
      return (
        <div className="blke__pair">
          <label className="blke__field">
            <span>Dirección de la imagen</span>
            <input
              id={id('src')}
              type="text"
              value={block.src}
              onChange={(event) => {
                onChange({ ...block, src: event.target.value });
              }}
            />
          </label>
          <label className="blke__field">
            <span>Texto alternativo</span>
            <input
              id={id('alt')}
              type="text"
              value={block.alt}
              onChange={(event) => {
                onChange({ ...block, alt: event.target.value });
              }}
            />
          </label>
        </div>
      );
  }
}
