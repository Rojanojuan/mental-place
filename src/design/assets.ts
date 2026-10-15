// Siluetas del traspaso de diseño. viewBox 0 0 200 480:
// la posición de un locus es {x: px / 200, y: py / 480} en 0–1.
import bodyFront from './body-front.svg';
import bodyBack from './body-back.svg';

export const BODY_VIEWBOX = { width: 200, height: 480 } as const;

export const BODY_SILHOUETTE: Record<'front' | 'back', string> = {
  front: bodyFront,
  back: bodyBack,
};
