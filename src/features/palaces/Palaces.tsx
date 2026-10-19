import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Palace } from '@/domain/types';
import { db, listLoci, listPalaces, removePalace, setCurrentPalace } from '@/db';
import {
  type CasaDelCatalogo,
  CUERPOS,
  anadirCasa,
  catalogoDeCasas,
  crearCuerpo,
} from './catalogo';
import './palaces.css';

const TIPO: Record<string, string> = {
  body_front: 'Cuerpo · de frente',
  body_back: 'Cuerpo · de espaldas',
  body_both: 'Cuerpo · frente y espalda',
  custom_plan: 'Lugar · plano',
  custom_image: 'Imagen propia',
};

/**
 * Palacios: los que tienes y los que puedes añadir.
 *
 * Las casas ya existían —diez planos amueblados, con su ruta— pero para usar
 * una había que **bajarse un JSON de 950 kB del repositorio e importarlo a
 * mano**. Existir no es estar integrado: aquí se eligen y se añaden sin salir
 * de la app (D-095).
 */
export function Palaces() {
  const [catalogo, setCatalogo] = useState<CasaDelCatalogo[] | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    catalogoDeCasas()
      .then(setCatalogo)
      .catch(() => {
        setCatalogo([]);
        setAviso('No se pudo leer el catálogo de lugares.');
      });
  }, []);

  const mios = useLiveQuery(async () => {
    const palaces = await listPalaces();
    const conCuenta = await Promise.all(
      palaces.map(async (palace) => ({
        palace,
        puntos: (await listLoci(palace.id)).length,
        items: await db.items.count(),
      })),
    );
    return conCuenta;
  }, []);

  const añadirLugar = (slug: string): void => {
    setCargando(slug);
    setAviso(null);
    void anadirCasa(slug)
      .then(async (palace) => {
        await setCurrentPalace(palace.id);
        setAviso(`«${palace.name}» añadido y en uso.`);
      })
      .catch((cause: unknown) => {
        setAviso(cause instanceof Error ? cause.message : 'No se pudo añadir.');
      })
      .finally(() => {
        setCargando(null);
      });
  };

  const añadirCuerpo = (kind: (typeof CUERPOS)[number]['kind']): void => {
    setAviso(null);
    void crearCuerpo(kind, nombre)
      .then(async (palace) => {
        await setCurrentPalace(palace.id);
        setNombre('');
        setAviso(`«${palace.name}» creado, vacío. Pon sus puntos en el editor.`);
      })
      .catch(() => {
        setAviso('No se pudo crear.');
      });
  };

  const borrar = (palace: Palace, puntos: number): void => {
    const texto =
      puntos === 0
        ? `¿Borrar «${palace.name}»?`
        : `¿Borrar «${palace.name}» y sus ${String(puntos)} puntos? Los ítems que tuvieran se quedan sin asignar, no se borran.`;
    if (!window.confirm(texto)) return;
    void removePalace(palace.id).then(() => {
      setAviso(`«${palace.name}» borrado.`);
    });
  };

  return (
    <section className="pal">
      <header>
        <h2>Palacios</h2>
        <p className="pal__sub">
          Un palacio es el sitio donde colocas lo que quieres recordar: un cuerpo, o un lugar con
          sus habitaciones y sus muebles.
        </p>
      </header>

      {aviso !== null && (
        <p className="pal__aviso" role="status">
          {aviso}
        </p>
      )}

      <h3>Los tuyos</h3>
      {mios === undefined ? (
        <p className="pal__hint">Abriendo la base de datos…</p>
      ) : mios.length === 0 ? (
        <p className="pal__hint">Todavía no tienes ninguno. Añade uno abajo.</p>
      ) : (
        <ul className="pal__mios">
          {mios.map(({ palace, puntos }) => (
            <li key={palace.id}>
              <button
                type="button"
                className="pal__usar"
                onClick={() => {
                  void setCurrentPalace(palace.id).then(() => {
                    setAviso(`«${palace.name}» en uso.`);
                  });
                }}
              >
                <span className="pal__nombre">{palace.name}</span>
                <span className="pal__meta">
                  {TIPO[palace.kind] ?? palace.kind} · {puntos} puntos
                </span>
              </button>
              <Link className="pal__editar" to="/editor" aria-label={`Editar ${palace.name}`}>
                Editar
              </Link>
              <button
                type="button"
                className="pal__borrar"
                aria-label={`Borrar ${palace.name}`}
                onClick={() => {
                  borrar(palace, puntos);
                }}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Añadir un lugar</h3>
      <p className="pal__hint">
        Diez planos amueblados: cada mueble es un punto y la ruta ya va en orden, empezando por la
        puerta. Se baja solo el que elijas.
      </p>
      {catalogo === null ? (
        <p className="pal__hint">Leyendo el catálogo…</p>
      ) : (
        <ul className="pal__casas">
          {catalogo.map((casa) => {
            const yaEsta = (mios ?? []).some((m) => m.palace.id === `pal-${casa.slug}`);
            return (
              <li key={casa.slug}>
                <span className="pal__nombre">{casa.name.replace(/ · .*$/, '')}</span>
                <span className="pal__meta">
                  {casa.puntos} puntos · {casa.habitaciones} habitaciones · {casa.kb} kB
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={yaEsta || cargando !== null}
                  onClick={() => {
                    añadirLugar(casa.slug);
                  }}
                >
                  {yaEsta ? 'Ya lo tienes' : cargando === casa.slug ? 'Añadiendo…' : 'Añadir'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h3>Añadir un cuerpo</h3>
      <p className="pal__hint">
        Vacío: los puntos los pones tú en el editor, tocando el cuerpo. Un palacio con puntos que no
        has elegido no es tu palacio.
      </p>
      <label className="pal__campo">
        <span>Nombre</span>
        <input
          type="text"
          value={nombre}
          placeholder="Cuerpo nuevo"
          onChange={(event) => {
            setNombre(event.target.value);
          }}
        />
      </label>
      <div className="pal__cuerpos">
        {CUERPOS.map((cuerpo) => (
          <button
            key={cuerpo.kind}
            type="button"
            className="btn"
            onClick={() => {
              añadirCuerpo(cuerpo.kind);
            }}
          >
            {cuerpo.label}
          </button>
        ))}
      </div>

      <p className="pal__hint pal__pie">
        ¿Quieres los diez lugares de golpe, o un palacio que te hayan pasado en un archivo? Eso
        sigue en <Link to="/datos">Datos</Link>.
      </p>
    </section>
  );
}
