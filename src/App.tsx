import { useState } from 'react';
import { Inspector } from '@/features/inspector/Inspector';
import { TokensPanel } from '@/features/tokens/TokensPanel';
import './App.css';

const TABS = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'tokens', label: 'Tokens' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Cáscara provisional. La Fase 4 la sustituye por las pantallas reales con
 * React Router; hasta entonces basta un conmutador para verificar el trabajo.
 */
export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tab, setTab] = useState<TabId>('inspector');

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
          <p className="shell__sub">Verificación de la ingesta · contenido y tokens del diseño</p>
        </div>
        <div className="shell__actions">
          <div className="tabs" role="tablist" aria-label="Vistas">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`tabs__btn${tab === t.id ? ' is-sel' : ''}`}
                onClick={() => {
                  setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={toggleTheme}>
            Tema: {theme === 'dark' ? 'oscuro' : 'claro'}
          </button>
        </div>
      </header>

      {tab === 'inspector' ? <Inspector /> : <TokensPanel />}
    </main>
  );
}
