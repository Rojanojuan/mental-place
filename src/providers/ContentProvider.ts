import type { Block, Item, Template } from '@/domain/types';

/**
 * Fase 7 · generar o enriquecer contenido con una IA.
 *
 * Aquí solo vive la **interfaz** y un doble que no habla con nadie. El
 * adaptador real (Gemini, Claude, el que sea) se conecta con la clave del
 * usuario y **nunca** con una clave en el código: por eso `ContentProvider`
 * no sabe de redes ni de claves, solo de contenido.
 *
 * La app no depende de esto (contrato §5): sin proveedor, todo se escribe a
 * mano y nada cambia.
 */

export interface GenerateRequest {
  /** Sobre qué: «el present perfect», «la vocal /iː/». */
  topic: string;
  /** La plantilla que debe rellenar, si hay una. */
  template?: Template | undefined;
  /** Idioma de la respuesta. Por defecto, el de la app. */
  lang?: string | undefined;
}

export interface GeneratedItem {
  title: string;
  front: string;
  back: string;
  blocks: Block[];
  tags: string[];
}

export interface EnrichRequest {
  item: Item;
  /** Qué se le pide añadir: ejemplos, un error típico, una mnemotecnia… */
  want: string;
}

export interface ContentProvider {
  /** Nombre para la pantalla de ajustes. */
  readonly name: string;
  /** Un ítem nuevo a partir de un tema. */
  generateItem(request: GenerateRequest): Promise<GeneratedItem>;
  /** Bloques que **se añaden** a un ítem: nunca reescribe lo que ya hay. */
  enrichItem(request: EnrichRequest): Promise<Block[]>;
}

/**
 * El proveedor de mentira.
 *
 * Devuelve contenido con la forma correcta y marcado como tal, para poder
 * construir y probar las pantallas sin ninguna clave ni ninguna llamada de
 * red. Que se note que es de mentira es parte del trato: un borrador que
 * parece real y no lo es, acaba estudiándose.
 */
export class MockContentProvider implements ContentProvider {
  readonly name = 'Borrador local (sin IA)';

  generateItem(request: GenerateRequest): Promise<GeneratedItem> {
    const campos = request.template?.fields ?? [];
    const blocks: Block[] = [
      {
        type: 'note',
        md: `Borrador sin IA para **${request.topic}**. Revísalo antes de estudiar.`,
      },
    ];
    if (campos.length > 0) {
      blocks.push({
        type: 'list',
        items: campos.map((campo) => `${campo.label}: (por completar)`),
      });
    }
    return Promise.resolve({
      title: request.topic,
      front: `¿Qué sabes de ${request.topic}?`,
      back: '(por completar)',
      blocks,
      tags: ['borrador'],
    });
  }

  enrichItem(request: EnrichRequest): Promise<Block[]> {
    return Promise.resolve([
      {
        type: 'note',
        md: `**${request.want}** para «${request.item.title}»: pendiente de escribir.`,
      },
    ]);
  }
}

/**
 * El proveedor en uso.
 *
 * Mientras no haya adaptador real, siempre el doble. Se deja como función y no
 * como constante para que conectarlo más adelante sea cambiar solo esto.
 */
export function currentProvider(): ContentProvider {
  return new MockContentProvider();
}
