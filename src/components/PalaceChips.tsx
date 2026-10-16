import { useLiveQuery } from 'dexie-react-hooks';
import type { ID } from '@/domain/types';
import { listPalaces, setCurrentPalace } from '@/db';
import './palace-chips.css';

/** Icono según el tipo de palacio, para distinguirlos de un vistazo. */
const MARK: Record<string, string> = {
  body_front: '◧',
  body_back: '◨',
  body_both: '◍',
  custom_image: '▣',
  custom_plan: '▦',
};

export interface PalaceChipsProps {
  currentId: ID;
  /** Se avisa al cambiar, por si la pantalla guarda estado del palacio viejo. */
  onChange?: (() => void) | undefined;
}

/**
 * Cambia de palacio. Solo aparece si hay más de uno: con uno solo sería ruido.
 * La elección se guarda y todas las pantallas la siguen.
 */
export function PalaceChips({ currentId, onChange }: PalaceChipsProps) {
  const palaces = useLiveQuery(() => listPalaces(), []);
  if (!palaces || palaces.length < 2) return null;

  return (
    <nav className="pchips" aria-label="Elegir palacio">
      {palaces.map((palace) => (
        <button
          key={palace.id}
          type="button"
          className={`chip${palace.id === currentId ? ' is-sel' : ''}`}
          aria-current={palace.id === currentId ? 'true' : undefined}
          onClick={() => {
            void setCurrentPalace(palace.id).then(() => {
              onChange?.();
            });
          }}
        >
          <span aria-hidden="true">{MARK[palace.kind] ?? '◍'}</span>
          {palace.name}
        </button>
      ))}
    </nav>
  );
}
