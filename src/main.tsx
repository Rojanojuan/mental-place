import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/base.css';
import { App } from './App';
import { bootstrap } from './bootstrap';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el nodo #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// La base de datos se prepara en paralelo: la UI ya está pintando su estado de
// carga y `useLiveQuery` recoge los datos en cuanto entran.
bootstrap().catch((cause: unknown) => {
  console.error('No se pudo preparar la base de datos', cause);
});
