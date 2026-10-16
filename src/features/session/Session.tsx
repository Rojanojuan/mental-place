import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import type { ScopeRequest } from '@/db';
import { BodyMap } from '@/components/BodyMap';
import { revealPanel } from '@/components/reveal';
import { PartTranslation } from '@/components/PartName';
import { BlockView } from '@/features/inspector/BlockView';
import type {
  Grade,
  ID,
  Item,
  Locus,
  LocusState,
  Palace,
  SceneObject,
  Schedule,
} from '@/domain/types';
import {
  getCurrentPalace,
  applyGrade,
  applyOverride,
  db,
  listLoci,
  listSceneObjects,
  previewForItem,
  queueFor,
  resolveSchedule,
  statusByLocus,
} from '@/db';
import { R10, type GradePreview, type OverrideTarget, type QueueScope } from '@/srs';
import { NextReviewSheet } from './NextReviewSheet';
import './session.css';

/** Las tres fases de una tarjeta (contrato §4.5). */
type Phase = 'point' | 'scene' | 'content';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_LABEL: Record<Grade, string> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil',
};
const PHASE_HINT: Record<Phase, string> = {
  point: 'Intenta recordar la escena y el contenido de este punto.',
  scene: '¿Qué codifican estos objetos?',
  content: '',
};

interface Card {
  itemId: ID;
  item: Item;
  locus: Locus | undefined;
  scene: SceneObject[];
  schedule: Schedule;
}

interface Pending {
  grade: Grade;
  proposedDueAt: Date;
  stage: number;
  mastered: boolean;
}

/**
 * La sesión de repaso: señalar el punto → revelar la escena → ver el contenido
 * → calificar → ajustar el próximo repaso si hace falta.
 *
 * Toda la aritmética la hace el motor puro; esta pantalla solo encadena pasos.
 */
export function Session() {
  const [params] = useSearchParams();
  // Entrar directo a /sesion (un marcador, la app instalada) corría contra la
  // siembra inicial y la cola salía vacía. Se espera a que haya algo.
  const itemCount = useLiveQuery(() => db.items.count(), []);
  // Las unidades de repaso del contrato §4.4: la cola de hoy, un punto, una
  // zona, el palacio entero o el recorrido.
  const scope = (params.get('scope') ?? 'today') as QueueScope;
  const zoneId = params.get('zona');
  const locusId = params.get('punto');

  const [cards, setCards] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('point');
  const [preview, setPreview] = useState<Record<Grade, GradePreview> | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [done, setDone] = useState<{ reviewed: number; before: Record<ID, LocusState> } | null>(
    null,
  );
  const [map, setMap] = useState<{
    loci: Locus[];
    statuses: Record<ID, LocusState>;
    style: Palace['style'];
  } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primeraVez = useRef(true);

  /**
   * En el telefono la vista sigue a la fase.
   *
   * No caben a la vez el cuerpo grande, la pregunta y una respuesta larga —son
   * 550 px de los 727 de un telefono—, asi que al revelar el contenido la
   * vista aterriza en la tarjeta, con la pregunta todavia arriba y el cuerpo a
   * un dedo de distancia. Al pasar a la tarjeta siguiente vuelve al cuerpo,
   * que es con lo que empieza el ejercicio.
   */
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    revealPanel(phase === 'content' ? cardRef.current : mapRef.current);
  }, [phase, index]);

  // La cola se arma una sola vez al entrar: si se recalculara en vivo, las
  // tarjetas se moverían bajo los pies del usuario al ir calificando.
  useEffect(() => {
    if (itemCount === undefined || itemCount === 0) return;
    const alive = { current: true };
    void (async () => {
      const now = new Date();
      const palace = await getCurrentPalace();
      const request: ScopeRequest = { scope, newLimit: 20 };
      if (palace) request.palaceId = palace.id;
      if (zoneId !== null) request.zoneId = zoneId;
      if (locusId !== null) request.locusId = locusId;
      // Fuera de la cola de hoy no se limitan los nuevos: si pides una zona,
      // la quieres entera.
      if (scope !== 'today') delete request.newLimit;
      const queue = await queueFor(request, now);
      const built: Card[] = [];
      for (const candidate of queue) {
        const item = await db.items.get(candidate.itemId);
        if (!item) continue;
        built.push({
          itemId: item.id,
          item,
          locus: item.locusId === null ? undefined : await db.loci.get(item.locusId),
          scene: item.locusId === null ? [] : await listSceneObjects(item.locusId),
          schedule: await resolveSchedule(item),
        });
      }
      if (!alive.current) return;
      if (palace) {
        setMap({
          loci: await listLoci(palace.id),
          statuses: await statusByLocus(palace.id, now),
          style: palace.style,
        });
      }
      setCards(built);
      setDone(built.length === 0 ? { reviewed: 0, before: {} } : null);
    })();
    return () => {
      alive.current = false;
    };
  }, [itemCount, locusId, scope, zoneId]);

  const card = cards?.[index];

  // Los intervalos de los cuatro botones, para pintarlos bajo cada etiqueta.
  useEffect(() => {
    if (!card) return;
    const alive = { current: true };
    void previewForItem(card.itemId, new Date())
      .then((result) => {
        if (alive.current) setPreview(result);
      })
      .catch(() => {
        // El ítem ya no está: la sesión se cerró o la base cambió.
      });
    return () => {
      alive.current = false;
    };
  }, [card]);

  const advance = useCallback(() => {
    setPending(null);
    setPhase('point');
    setIndex((value) => {
      const next = value + 1;
      if (cards && next >= cards.length) setDone({ reviewed: cards.length, before: {} });
      return next;
    });
  }, [cards]);

  const reveal = useCallback(() => {
    setPhase((value) => (value === 'point' ? 'scene' : 'content'));
  }, []);

  const chooseGrade = useCallback(
    (grade: Grade) => {
      if (!card || pending) return;
      const proposal = preview?.[grade];
      if (!proposal) return;
      setPending({
        grade,
        proposedDueAt: proposal.at,
        stage: proposal.stage,
        mastered: proposal.mastered,
      });
    },
    [card, pending, preview],
  );

  const accept = useCallback(async () => {
    if (!card || !pending) return;
    await applyGrade(card.itemId, pending.grade, new Date());
    advance();
  }, [advance, card, pending]);

  const adjust = useCallback(
    async (target: OverrideTarget) => {
      if (!card || !pending) return;
      await applyOverride(card.itemId, target, new Date(), { grade: pending.grade });
      advance();
    },
    [advance, card, pending],
  );

  // Teclado: espacio revela, 1–4 califican (contrato, Fase 6 lo amplía).
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (pending) return;
      if (event.key === ' ') {
        event.preventDefault();
        if (phase !== 'content') reveal();
        return;
      }
      const slot = Number(event.key);
      if (phase === 'content' && slot >= 1 && slot <= 4) {
        event.preventDefault();
        const picked = GRADES[slot - 1];
        if (picked) chooseGrade(picked);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [chooseGrade, pending, phase, reveal]);

  const statuses = useMemo(() => map?.statuses ?? {}, [map]);

  if (!cards) {
    return (
      <section className="ses ses--msg">
        <p className="insp__shimmer">Armando la cola…</p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="ses ses--msg">
        <h2>{done.reviewed === 0 ? 'No hay nada que repasar' : 'Sesión terminada'}</h2>
        <p className="ses__sub">
          {done.reviewed === 0
            ? 'Vuelve cuando venza algún repaso, o haz un recorrido para pasearte por el palacio.'
            : `${String(done.reviewed)} ${done.reviewed === 1 ? 'tarjeta repasada' : 'tarjetas repasadas'}.`}
        </p>
        {map && (
          <div className="ses__summary">
            <BodyMap
              loci={map.loci}
              statusByLocus={statuses}
              appearance={map.style}
              maxHeight="40dvh"
            />
          </div>
        )}
        <div className="ses__actions">
          <Link className="btn btn--primary" to="/">
            Volver a Hoy
          </Link>
          {done.reviewed === 0 && scope !== 'walk' && (
            <Link className="btn" to="/sesion?scope=walk">
              Hacer un recorrido
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (!card) return null;

  const total = cards.length;
  const schedule = card.schedule.intervals.length > 0 ? card.schedule : R10;

  return (
    <section className="ses">
      <header className="ses__head">
        <Link className="ses__exit" to="/">
          ← Salir
        </Link>
        <span className="ses__progress mono">
          {index + 1} / {total}
        </span>
      </header>
      <div className="ses__bar" aria-hidden="true">
        <span style={{ width: `${String(Math.round((index / total) * 100))}%` }} />
      </div>

      {/* El cuerpo manda mientras se intenta recordar y se encoge al revelar
          el contenido, que es cuando hace falta sitio para leer. El diseño lo
          fija en 440 px → 200 px (`stageH` de PalacioApp.dc.html). */}
      <div className={`ses__body${phase === 'content' ? ' ses__body--leyendo' : ''}`}>
        <div className="ses__map" ref={mapRef}>
          {map && (
            <BodyMap
              loci={map.loci}
              statusByLocus={statuses}
              appearance={map.style}
              focusId={card.locus?.id ?? null}
              zoom={2.2}
              maxHeight="none"
              className="ses__bodymap"
              label={`Punto señalado: ${card.locus?.partName ?? 'sin asignar'}`}
            />
          )}
          <p className="ses__part">
            {card.locus ? (
              <>
                <span className="mono">{card.locus.routeNo}</span> · {card.locus.partName}
              </>
            ) : (
              'Ítem sin asignar'
            )}
          </p>
          {card.locus && (
            <p className="ses__parten">
              <PartTranslation locus={card.locus} />
            </p>
          )}
          {card.locus?.anchor && <p className="ses__anchor">{card.locus.anchor.text}</p>}
        </div>

        <div className="ses__card" ref={cardRef}>
          {PHASE_HINT[phase] !== '' && <p className="ses__hint">{PHASE_HINT[phase]}</p>}

          {phase !== 'point' && card.scene.length > 0 && (
            <ul className="ses__scene">
              {card.scene.map((object, i) => (
                <li key={object.id} style={{ animationDelay: `${String(i * 90)}ms` }}>
                  <strong>{object.text}</strong>
                  {object.represents !== undefined && <span> — {object.represents}</span>}
                </li>
              ))}
            </ul>
          )}

          <p className="ses__front">{card.item.front ?? card.item.title}</p>

          {phase === 'content' && (
            <div className="ses__content">
              {card.item.back !== undefined && <p className="ses__back">{card.item.back}</p>}
              {card.item.blocks.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* «Revelar» ocupa el mismo sitio que luego ocupan los cuatro botones de
          calificar: pegado abajo, al alcance del pulgar. Dentro de la tarjeta
          caía 68 px por debajo del borde del teléfono. */}
      {phase !== 'content' && (
        <div className="ses__act">
          <button type="button" className="btn btn--primary ses__reveal" onClick={reveal}>
            Revelar {phase === 'point' && card.scene.length > 0 ? 'la escena' : 'el contenido'}
            <kbd>espacio</kbd>
          </button>
        </div>
      )}

      {phase === 'content' && !pending && (
        <div className="ses__grades">
          {GRADES.map((grade, i) => (
            <button
              key={grade}
              type="button"
              className={`grade grade--${grade}`}
              aria-label={`${GRADE_LABEL[grade]} · ${preview?.[grade].label ?? ''}`}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => {
                chooseGrade(grade);
              }}
            >
              <span className="grade__label">{GRADE_LABEL[grade]}</span>
              <span className="grade__interval mono">{preview?.[grade].label ?? '…'}</span>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>
      )}

      {pending && (
        <NextReviewSheet
          grade={pending.grade}
          proposedDueAt={pending.proposedDueAt}
          stage={pending.stage}
          mastered={pending.mastered}
          schedule={schedule}
          now={new Date()}
          onAccept={() => {
            void accept();
          }}
          onOverride={(target) => {
            void adjust(target);
          }}
        />
      )}
    </section>
  );
}
