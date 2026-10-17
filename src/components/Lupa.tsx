import { useMemo } from 'react';
import type { ID, Locus, LocusState, PalaceStyle } from '@/domain/types';
import { BodyMap } from './BodyMap';
import { diametroSinSolape, recorteDenso } from './lupa-crop';
import './lupa.css';

/**
 * Lupa: los puntos amontonados, separados.
 *
 * En el cuerpo de fonética 15 de los 45 puntos caen en la cabeza y sus áreas
 * táctiles se solapan. El diseño lo resuelve con un círculo muy ampliado sobre
 * esa zona, donde cada punto recupera su número y su estado (D-088).
 */
export function Lupa({
  loci,
  statusByLocus,
  selectedId = null,
  onLocusTap,
  appearance,
  side = 'front',
  title,
}: {
  loci: Locus[];
  statusByLocus: Record<ID, LocusState>;
  selectedId?: ID | null;
  onLocusTap?: ((id: ID) => void) | undefined;
  appearance?: PalaceStyle | undefined;
  side?: 'front' | 'back';
  title?: string | undefined;
}) {
  const recorte = useMemo(() => recorteDenso(loci, side), [loci, side]);
  if (recorte === null) return null;

  // Solo los del lado que se amplía: los del otro cuerpo caerían encima.
  const visibles = loci.filter((l) => l.side === side);
  // El tamaño lo decide el hueco disponible, no un porcentaje fijo: agrandar
  // los pines a ojo los volvía a amontonar.
  const pin = diametroSinSolape(visibles, recorte);

  return (
    <figure className="lupa">
      <figcaption className="lupa__title">{title ?? 'Lupa · puntos juntos'}</figcaption>
      <div className="lupa__circle">
        <BodyMap
          loci={visibles}
          statusByLocus={statusByLocus}
          appearance={appearance}
          viewport={recorte}
          pinSize={pin}
          maxHeight="none"
          className="lupa__map"
          selectedIds={selectedId === null ? [] : [selectedId]}
          onLocusTap={onLocusTap}
          pinLabelPrefix="Lupa"
          label={`${title ?? 'Lupa'}: ${String(visibles.filter((l) => l.dense === true).length)} puntos ampliados`}
        />
      </div>
    </figure>
  );
}
