import { useState } from 'react';

export interface InlineTextProps {
  value: string;
  label: string;
  placeholder?: string;
  className?: string;
  /** Se llama al salir del campo o al pulsar Enter, no en cada tecla. */
  onCommit: (value: string) => void;
}

/**
 * Campo de texto que **guarda su propio borrador** y solo avisa al salir o al
 * pulsar Enter.
 *
 * Escribir en la base en cada tecla, con una consulta en vivo detrás, hace que
 * el valor vuelva a medio teclear y lo escrito se pegue mal —el mismo problema
 * que `NumberField` (D-044)—, y además escribe en IndexedDB una vez por letra.
 */
export function InlineText({ value, label, placeholder, className, onCommit }: InlineTextProps) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);

  // Si el valor cambia de fuera, se refresca durante el render.
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }

  const commit = (): void => {
    const next = text.trim();
    if (next !== '' && next !== value) onCommit(next);
    else if (next === '') setText(value);
  };

  return (
    <input
      type="text"
      aria-label={label}
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          setText(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
