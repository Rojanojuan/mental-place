import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBackup, downloadText } from '@/io';

/** jsdom no implementa Blob URLs: se sustituyen para ver qué se descarga. */
function stubBlobUrls(): { revoked: string[] } {
  const revoked: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prueba');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
    revoked.push(url);
  });
  return { revoked };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadText', () => {
  it('dispara un enlace de descarga con el nombre pedido', () => {
    const { revoked } = stubBlobUrls();
    const clicked: { download: string; href: string }[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.href });
    });

    downloadText('hola', 'archivo.json');

    expect(click).toHaveBeenCalledTimes(1);
    expect(clicked[0]?.download).toBe('archivo.json');
    expect(clicked[0]?.href).toBe('blob:prueba');
    // Y limpia detrás de sí: ni enlace suelto ni URL sin revocar.
    expect(document.querySelector('a')).toBeNull();
    expect(revoked).toEqual(['blob:prueba']);
  });

  it('la copia de seguridad va con la fecha en el nombre', () => {
    stubBlobUrls();
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });

    downloadBackup({ version: 1 }, new Date(2026, 9, 15));
    expect(names).toEqual(['palacio-corporal-2026-10-15.json']);
  });
});
