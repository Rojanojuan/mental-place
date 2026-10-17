import { describe, expect, it } from 'vitest';
import type { Item, Template } from '@/domain/types';
import { MockContentProvider, currentProvider } from '@/providers';

const plantilla: Template = {
  id: 'tpl-voc',
  name: 'Vocabulario',
  fields: [
    { key: 'word', label: 'Palabra', kind: 'text' },
    { key: 'trans', label: 'Traducción', kind: 'text' },
  ],
  blockOrder: ['text', 'list'],
};

const item: Item = {
  id: 'itm-1',
  locusId: null,
  title: 'Present perfect',
  blocks: [],
  tags: [],
  fields: {},
  origin: 'manual',
  templateId: 'tpl-libre',
  createdAt: new Date(2026, 0, 1).toISOString(),
  updatedAt: new Date(2026, 0, 1).toISOString(),
};

describe('el proveedor de contenido', () => {
  it('por ahora siempre es el doble, sin red ni claves', () => {
    expect(currentProvider()).toBeInstanceOf(MockContentProvider);
  });

  it('genera un ítem con la forma que pide el contrato', async () => {
    const out = await currentProvider().generateItem({ topic: 'La vocal /iː/' });
    expect(out.title).toBe('La vocal /iː/');
    expect(out.front).toContain('/iː/');
    expect(out.blocks.length).toBeGreaterThan(0);
  });

  it('deja claro que es un borrador: lo que parece real se acaba estudiando', async () => {
    const out = await currentProvider().generateItem({ topic: 'X' });
    expect(out.tags).toContain('borrador');
    expect(JSON.stringify(out.blocks)).toMatch(/[Bb]orrador/);
  });

  it('con plantilla, enumera sus campos para completarlos', async () => {
    const out = await currentProvider().generateItem({ topic: 'Dog', template: plantilla });
    const lista = out.blocks.find((b) => b.type === 'list');
    expect(lista).toBeDefined();
    expect(JSON.stringify(lista)).toContain('Palabra');
    expect(JSON.stringify(lista)).toContain('Traducción');
  });

  it('enriquecer devuelve bloques que se AÑADEN, sin tocar los del ítem', async () => {
    const extra = await currentProvider().enrichItem({ item, want: 'Un error típico' });
    expect(extra.length).toBeGreaterThan(0);
    expect(JSON.stringify(extra)).toContain('Present perfect');
    // El ítem original no se modifica: el que llama decide qué hacer.
    expect(item.blocks).toEqual([]);
  });
});
