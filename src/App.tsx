import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Inspector } from '@/features/inspector/Inspector';
import { Session } from '@/features/session/Session';
import { Today } from '@/features/today/Today';
import { TokensPanel } from '@/features/tokens/TokensPanel';
import './App.css';

const NAV = [
  { to: '/', label: 'Hoy' },
  { to: '/inspector', label: 'Palacio' },
  { to: '/tokens', label: 'Tokens' },
] as const;

/**
 * Cáscara de la app. Las pantallas que faltan (Biblioteca, Horarios,
 * Estadísticas, Importar/exportar, editores) entran aquí como rutas nuevas.
 */
export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-pc-theme', next);
  };

  return (
    <main className="shell">
      <header className="shell__head">
        <div>
          <h1>Palacio Corporal</h1>
        </div>
        <div className="shell__actions">
          <nav className="tabs" aria-label="Secciones">
            {NAV.map((entry) => (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.to === '/'}
                className={({ isActive }) => `tabs__btn${isActive ? ' is-sel' : ''}`}
              >
                {entry.label}
              </NavLink>
            ))}
          </nav>
          <button type="button" className="btn" onClick={toggleTheme}>
            Tema: {theme === 'dark' ? 'oscuro' : 'claro'}
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/sesion" element={<Session />} />
        <Route path="/inspector" element={<Inspector />} />
        <Route path="/tokens" element={<TokensPanel />} />
        <Route path="*" element={<Today />} />
      </Routes>
    </main>
  );
}
