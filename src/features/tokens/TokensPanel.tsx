import { BODY_SILHOUETTE, BODY_VIEWBOX } from '@/design/assets';
import { STATE_LABEL, STATE_TOKEN } from '@/design/states';
import type { LocusState } from '@/domain/types';

const STATES = Object.keys(STATE_TOKEN) as LocusState[];
const SIDES = ['front', 'back'] as const;

/**
 * Comprobación de la Fase 0: los tokens y las siluetas del traspaso de diseño
 * cargan y responden a los dos temas. La Fase 4 la retira.
 */
export function TokensPanel() {
  return (
    <>
      <section aria-labelledby="estados">
        <h2 id="estados">Estados semánticos</h2>
        <ul className="swatches">
          {STATES.map((state) => (
            <li key={state} className="swatch">
              <span className="swatch__dot" style={{ background: `var(${STATE_TOKEN[state]})` }} />
              <span className="swatch__name">{STATE_LABEL[state]}</span>
              <code className="swatch__token">{STATE_TOKEN[state]}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="silueta">
        <h2 id="silueta">
          Silueta · viewBox {BODY_VIEWBOX.width}×{BODY_VIEWBOX.height}
        </h2>
        <div className="bodies">
          {SIDES.map((side) => (
            <img
              key={side}
              className="bodies__img"
              src={BODY_SILHOUETTE[side]}
              alt={side === 'front' ? 'Silueta frontal' : 'Silueta posterior'}
            />
          ))}
        </div>
      </section>
    </>
  );
}
