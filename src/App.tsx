import { useState } from 'react';
import { BODY_SILHOUETTE, BODY_VIEWBOX } from './design/assets';
import { STATE_LABEL, STATE_TOKEN } from './design/states';
import type { LocusState } from './domain/types';
import './App.css';

const STATES = Object.keys(STATE_TOKEN) as LocusState[];
const SIDES = ['front', 'back'] as const;

/**
 * Pantalla de verificación de la Fase 0 (andamiaje).
 * Comprueba que los tokens y las siluetas del traspaso de diseño cargan en los dos temas.
 * La Fase 4 la sustituye por las pantallas reales.
 */
export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-pc-theme', next);
  };

  return (
    <main className="shell">
      <header className="shell__head">
        <div>
          <h1>Palacio Corporal</h1>
          <p className="shell__sub">
            Fase 0 · andamiaje listo. Tokens y siluetas del diseño cargados.
          </p>
        </div>
        <button type="button" className="btn" onClick={toggleTheme}>
          Tema: {theme === 'dark' ? 'oscuro' : 'claro'}
        </button>
      </header>

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
    </main>
  );
}
