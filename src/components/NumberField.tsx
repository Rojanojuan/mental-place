import { useState } from 'react';

export interface NumberFieldProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** Se llama solo cuando lo escrito es un número válido dentro del rango. */
  onCommit: (value: number) => void;
}

/**
 * Campo numérico que **guarda su propio texto**.
 *
 * Un `<input type="number">` controlado directamente por el número no se puede
 * vaciar para reescribirlo: al borrarlo, el padre rechaza el `0` o el `NaN` y
 * vuelve a pintar el valor viejo, así que lo que se teclea se va pegando
 * delante («10» → «1015»). Manteniendo el texto aquí, el campo se puede dejar
 * vacío mientras se escribe y el padre solo recibe números válidos.
 */
export function NumberField({
  value,
  label,
  min,
  max,
  step,
  className,
  onCommit,
}: NumberFieldProps) {
  const [text, setText] = useState(() => String(value));
  const [seen, setSeen] = useState(value);

  // Si el valor llega cambiado de fuera (se eligió otro horario), se refresca.
  // Se ajusta durante el render, no en un efecto: así no hay un segundo
  // pintado ni el aviso de renders en cascada.
  if (value !== seen) {
    setSeen(value);
    setText(String(value));
  }

  return (
    <input
      type="number"
      aria-label={label}
      className={className}
      value={text}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        if (raw.trim() === '') return;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        if (min !== undefined && parsed < min) return;
        if (max !== undefined && parsed > max) return;
        onCommit(parsed);
      }}
    />
  );
}
