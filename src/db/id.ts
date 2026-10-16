/**
 * Ids para los registros nuevos. Vive aquí, en la capa de persistencia,
 * porque el dominio y el motor de repaso son puros: no pueden usar
 * aleatoriedad (ver docs/DECISIONES.md D-015).
 */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid.replace(/-/g, '').slice(0, 12)}`;
}

/** Instante actual en ISO UTC, como guarda todo el contrato. */
export const stamp = (): string => new Date().toISOString();
