import type { Locus } from '@/domain/types';
import './part-name.css';

export type PartSource = Pick<Locus, 'partNameEn' | 'partIpa'>;

/**
 * El nombre de la parte en el idioma que se estudia, con su transcripción:
 * «Hair /heər/». Va al lado del nombre del punto, porque la parte del cuerpo
 * también se memoriza.
 */
export function PartTranslation({ locus, className }: { locus: PartSource; className?: string }) {
  if (locus.partNameEn === undefined || locus.partNameEn === '') return null;
  return (
    <span className={className === undefined ? 'partx' : `partx ${className}`}>
      {locus.partNameEn}
      {locus.partIpa !== undefined && locus.partIpa !== '' && (
        <span className="partx__ipa mono"> /{locus.partIpa}/</span>
      )}
    </span>
  );
}
