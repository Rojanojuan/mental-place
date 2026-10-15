#!/usr/bin/env python3
"""Convierte `documentación/Guia_Fonetica 2026.docx` en `seed/fonetica45.json`.

Formato de salida: JSON v1 del CONTRATO COMPARTIDO §5 (ver CLAUDE.md §10.5).

Es una herramienta offline y reproducible: si se corrige el Word, se vuelve a
correr y la semilla se regenera. No forma parte del bundle de la app.
Solo librería estándar (ver docs/DECISIONES.md D-010).

Uso:  python scripts/ingest_fonetica.py [--docx RUTA] [--out RUTA] [--report RUTA]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

ROOT = Path(__file__).resolve().parent.parent
PALACE_ID = 'pal-fonetica45'
TEMPLATE_ID = 'tpl-fonetica'
DECK_ID = 'dck-fonetica45'
SCHEDULE_ID = 'sch-r10'

# Los 10 comodines del sistema mnemotécnico (docx § «Sistema mnemotécnico · Comodines»).
# El comodín de cada sonido codifica CUÁNTOS patrones de escritura tiene.
COMODINES = {
    'flecha': 1,
    'pato': 2,
    'senos o nalgas': 3,
    'senos': 3,
    'nalgas': 3,
    'silla': 4,
    'mujer embarazada': 5,
    'caracol': 6,
    'espada': 7,
    'muneco de nieve': 8,
    'globo': 9,
    'messi': 10,
}

# Glifos IPA escritos en mayúscula o con dos puntos ASCII en el documento original.
IPA_FIXES = {
    'Ɔ': 'ɔ', 'Ʌ': 'ʌ', 'Ʊ': 'ʊ', 'Ə': 'ə', 'Ɑ': 'ɑ', 'Ɛ': 'ɛ', 'Ɪ': 'ɪ',
    'Ʃ': 'ʃ', 'Ʒ': 'ʒ', 'Ŋ': 'ŋ', 'Θ': 'θ', 'Ð': 'ð', 'ʧ': 'ʧ', 'ʤ': 'ʤ',
    'W': 'w', 'E': 'e', 'I': 'i', 'U': 'u', 'A': 'a', 'O': 'o',
    'P': 'p', 'B': 'b', 'T': 't', 'D': 'd', 'K': 'k', 'G': 'g',
    'F': 'f', 'V': 'v', 'S': 's', 'Z': 'z', 'M': 'm', 'N': 'n',
    'L': 'l', 'R': 'r', 'H': 'h', 'J': 'j', 'Y': 'y',
    ':': 'ː',
}

SUBSECTIONS = {
    'pronunciacion del sonido': 'pron',
    'equivalente en espanol': 'equiv',
    'diferencias entre ingles britanico y americano': 'variants',
    'ejemplos de palabras con el sonido': 'examples',
    'patrones del sonido': 'patterns',
    'patroness del sonido': 'patterns',
    'excepciones': 'restrictions',
    'minimal pairs': 'pairs',
    'rima / trabalenguas / poema': 'rhymes',
}

anomalies: list[tuple[int | None, str]] = []


def warn(section: int | None, msg: str) -> None:
    anomalies.append((section, msg))


# --------------------------------------------------------------------------- utilidades


def fold(s: str) -> str:
    """Minúsculas sin acentos ni espacios dobles, para comparar títulos."""
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s).strip().strip(':.').lower()


def squash(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()


def rel_to_root(p: Path) -> str:
    try:
        return p.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return p.as_posix()


def fix_ipa(s: str) -> str:
    return ''.join(IPA_FIXES.get(c, c) for c in s)


def slash(s: str) -> str:
    """Notación fonética para texto visible: `iː` → `/iː/`.

    En `fields` el símbolo se guarda limpio; las barras son presentación.
    """
    return f'/{s}/' if s else ''


def text_of(el: ET.Element) -> str:
    return squash(''.join(t.text or '' for t in el.iter(W + 't')))


def style_of(p: ET.Element) -> str:
    pr = p.find(W + 'pPr')
    if pr is None:
        return ''
    st = pr.find(W + 'pStyle')
    return st.get(W + 'val', '') if st is not None else ''


def link_in(el: ET.Element, rels: dict[str, str]) -> str | None:
    for h in el.iter(W + 'hyperlink'):
        rid = h.get(R + 'id')
        if rid and rid in rels:
            return rels[rid]
    return None


def cells_of(tr: ET.Element) -> list[ET.Element]:
    return tr.findall(W + 'tc')


def row_text(tr: ET.Element) -> list[str]:
    return [text_of(tc) for tc in cells_of(tr)]


# ----------------------------------------------------------------------------- parseo


def read_docx(path: Path) -> tuple[ET.Element, dict[str, str]]:
    with zipfile.ZipFile(path) as z:
        doc = ET.fromstring(z.read('word/document.xml'))
        rels_xml = ET.fromstring(z.read('word/_rels/document.xml.rels'))
    rels = {
        r.get('Id', ''): r.get('Target', '')
        for r in rels_xml
        if r.get('TargetMode') == 'External'
    }
    body = doc.find(W + 'body')
    if body is None:
        raise SystemExit('El .docx no tiene <w:body>')
    return body, rels


HEAD_RE = re.compile(
    r'^(\d+)\.\s*(.+?)\s*\(\s*(.+?)\s*/(.+?)/\s*\)\s*[·|•]\s*Sonido\s*/(.+?)/\s*$'
)
KEYWORD_RE = re.compile(r'^Palabra\s+clave\s*:\s*(.+?)\s*/(.+?)/\s*[—–-]\s*(.+?)\.?$', re.I)
# El documento no usa etiquetas fijas para la teoría: unas secciones escriben
# «Posición de Labios:», otras «Posición inicial:», «Deslizamiento hacia /ɪ/:» o
# prosa suelta. Se reconoce cualquier etiqueta corta seguida de dos puntos.
LABEL_RE = re.compile(r'^([^:]{3,60}?)\s*:\s*(\S.*)$')
# Claves canónicas, para quien quiera leerlas estructuradas desde `fields`.
CANON_LABELS = {
    'labios': 'lips',
    'posicion de labios': 'lips',
    'posicion de los labios': 'lips',
    'mandibula': 'jaw',
    'posicion de la mandibula': 'jaw',
    'lengua': 'tongue',
    'posicion de la lengua': 'tongue',
    'duracion': 'duration',
}


def split_sections(body: ET.Element) -> list[dict]:
    """Corta el cuerpo del documento en secciones, una por parte del cuerpo."""
    sections: list[dict] = []
    current: dict | None = None
    sub = None

    for el in body:
        if el.tag == W + 'p':
            txt = text_of(el)
            st = style_of(el)
            if st == 'Ttulo1' and re.match(r'^\d+\.', txt):
                m = HEAD_RE.match(txt)
                if not m:
                    warn(None, f'Cabecera no reconocida y saltada: «{txt}»')
                    current = None
                    continue
                current = {
                    'n': int(m.group(1)),
                    'part': squash(m.group(2)),
                    'partEn': squash(m.group(3)),
                    'partIpa': fix_ipa(squash(m.group(4))),
                    'soundRaw': squash(m.group(5)),
                    'sound': fix_ipa(squash(m.group(5))),
                    'keyword': None,
                    'comodin': None,
                    'content': {},
                    'notes': [],
                }
                sections.append(current)
                sub = None
                continue
            if current is None or not txt:
                continue
            if st == 'Ttulo2':
                key = SUBSECTIONS.get(fold(txt))
                if key:
                    sub = key
                else:
                    # Título suelto: no se descarta, se guarda como nota y el
                    # contenido que sigue se adjunta a la subsección anterior.
                    current['notes'].append(txt)
                    warn(current['n'], f'Título no estándar conservado como nota: «{txt}»')
                continue
            if current['keyword'] is None:
                km = KEYWORD_RE.match(txt)
                if km:
                    current['keyword'] = {
                        'en': squash(km.group(1)),
                        'ipa': fix_ipa(squash(km.group(2))),
                        'es': squash(km.group(3)),
                    }
                    continue
            if sub is None and current['comodin'] is None and fold(txt) in COMODINES:
                current['comodin'] = {'n': COMODINES[fold(txt)], 'name': squash(txt)}
                continue
            current['content'].setdefault(sub or 'pron', []).append(('p', txt, el))
        elif el.tag == W + 'tbl' and current is not None:
            current['content'].setdefault(sub or 'pron', []).append(('tbl', '', el))
    return sections


def classify_table(tbl: ET.Element) -> str:
    rows = tbl.findall(W + 'tr')
    if not rows:
        return 'empty'
    hdr = [fold(c) for c in row_text(rows[0])]
    if hdr[:2] == ['espanol', 'ingles']:
        return 'words'
    if hdr[:2] == ['ingles', 'transcripcion fonetica'] or hdr[:2] == ['ingles', 'transcripcion']:
        # Variante sin columna de español (§6).
        return 'words-noes'
    if hdr[:2] == ['#', 'patron']:
        return 'patterns'
    if hdr[:2] == ['#', 'ingles'] and len(hdr) >= 7:
        return 'pairs'
    return 'unknown'


def parse_words(
    tbl: ET.Element, rels: dict[str, str], links: dict[str, str], with_es: bool = True
) -> list[dict]:
    out = []
    es_at, en_at, ipa_at = (0, 1, 2) if with_es else (None, 0, 1)
    for tr in tbl.findall(W + 'tr')[1:]:
        tcs = cells_of(tr)
        if len(tcs) < (3 if with_es else 2):
            continue
        es = text_of(tcs[es_at]) if es_at is not None else ''
        en, ipa = text_of(tcs[en_at]), text_of(tcs[ipa_at])
        if not (es or en):
            continue
        url = link_in(tcs[en_at], rels)
        if url and en:
            links[en] = url
        out.append({'es': es, 'en': en, 'ipa': fix_ipa(ipa)})
    return out


def parse_patterns(
    tbl: ET.Element, rels: dict[str, str], links: dict[str, str], n: int
) -> list[dict]:
    groups: list[dict] = []
    auto = 0
    for tr in tbl.findall(W + 'tr')[1:]:
        tcs = cells_of(tr)
        if len(tcs) < 5:
            if any(text_of(c) for c in tcs):
                warn(n, f'Fila de patrones con {len(tcs)} celdas (se esperaban 5), ignorada')
            continue
        num, pat = text_of(tcs[0]), text_of(tcs[1])
        es, en, ipa = text_of(tcs[2]), text_of(tcs[3]), text_of(tcs[4])
        if num.isdigit() or (pat and not groups):
            auto = int(num) if num.isdigit() else auto + 1
            groups.append({'n': auto, 'pattern': pat, 'words': []})
            if not num.isdigit():
                warn(
                    n,
                    f'Grupo de patrón sin número en la columna «#»: la celda «Patrón» dice '
                    f'«{pat}». Se importó como un solo grupo ({auto}); si son varios '
                    f'patrones, hay que separarlos en filas distintas en el Word',
                )
        elif pat and groups and pat != groups[-1]['pattern']:
            auto += 1
            groups.append({'n': auto, 'pattern': pat, 'words': []})
            warn(n, f'Grupo de patrón sin numerar («{pat}»): se numeró {auto}')
        if not groups:
            continue
        if not (es or en):
            continue
        url = link_in(tcs[3], rels)
        if url and en:
            links[en] = url
        groups[-1]['words'].append({'es': es, 'en': en, 'ipa': fix_ipa(ipa)})
    return groups


def parse_pairs(tbl: ET.Element, rels: dict[str, str], links: dict[str, str]) -> list[dict]:
    out = []
    for tr in tbl.findall(W + 'tr')[1:]:
        tcs = cells_of(tr)
        if len(tcs) < 8:
            continue
        a = {'en': text_of(tcs[1]), 'ipa': fix_ipa(text_of(tcs[2])), 'es': text_of(tcs[3])}
        b = {'en': text_of(tcs[5]), 'ipa': fix_ipa(text_of(tcs[6])), 'es': text_of(tcs[7])}
        if not (a['en'] or b['en']):
            continue
        for idx, side in ((1, a), (5, b)):
            url = link_in(tcs[idx], rels)
            if url and side['en']:
                links[side['en']] = url
        out.append({'n': text_of(tcs[0]), 'a': a, 'b': b})
    return out


def parse_theory(paragraphs: list[str]) -> dict:
    """Separa la teoría de producción del sonido en prosa + pasos etiquetados.

    Conserva las etiquetas tal como las escribe el documento, porque cada sonido
    explica lo suyo: unos hablan de labios y mandíbula, los diptongos de
    «posición inicial» y «deslizamiento».
    """
    prose: list[str] = []
    howto: list[dict] = []
    canon: dict[str, str] = {}
    for txt in paragraphs:
        m = LABEL_RE.match(txt)
        if m:
            label, value = squash(m.group(1)), squash(m.group(2))
            howto.append({'label': label, 'value': value})
            key = CANON_LABELS.get(fold(label))
            if key:
                canon[key] = value
            continue
        prose.append(txt)
    return {'equivalent': ' '.join(prose), 'howto': howto, **canon}


def parse_rhymes(entries: list[tuple], rels: dict[str, str]) -> tuple[list[dict], list[dict]]:
    """Agrupa los tripletes inglés / transcripción / (traducción) y los audios."""
    lines: list[dict] = []
    audio: list[dict] = []
    pending: dict | None = None
    for kind, txt, el in entries:
        if kind != 'p':
            continue
        if txt.startswith('🔊') or fold(txt).startswith('escuchar'):
            url = link_in(el, rels)
            if url:
                label = 'americano' if 'americ' in fold(txt) else 'británico'
                audio.append({'label': label, 'url': url})
            continue
        if txt.startswith('/'):
            if pending is not None:
                pending['ipa'] = fix_ipa(txt.strip('/ '))
            continue
        if txt.startswith('(') and txt.endswith(')'):
            if pending is not None:
                pending['es'] = txt[1:-1].strip()
                lines.append(pending)
                pending = None
            continue
        if pending is not None:
            lines.append(pending)
        pending = {'en': txt.strip('"“” '), 'ipa': '', 'es': ''}
    if pending is not None:
        lines.append(pending)
    return lines, audio


# ------------------------------------------------------------------ datos del diseño

LOCUS_RE = re.compile(
    r"S\(\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*([\d.]+),\s*([\d.]+)"
    r"(?:\s*,\s*'(front|back)')?(?:\s*,\s*(true|false))?\s*\)"
)
ZONE_RE = re.compile(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}")


def read_std45(pc_data: Path) -> tuple[list[dict], list[dict]]:
    """Lee STD45 y STD45_ZONES del traspaso de diseño (fuente de la geometría)."""
    src = pc_data.read_text(encoding='utf-8')
    zblock = re.search(r'STD45_ZONES\s*=\s*\[(.*?)\];', src, re.S)
    lblock = re.search(r'STD45\s*=\s*\[(.*?)\];', src, re.S)
    if not zblock or not lblock:
        raise SystemExit('No se encontraron STD45 / STD45_ZONES en pc-data.js')
    zones = [
        {'id': m.group(1), 'name': m.group(2), 'order': i}
        for i, m in enumerate(ZONE_RE.finditer(zblock.group(1)))
    ]
    loci = [
        {
            'n': int(m.group(1)),
            'name': m.group(2),
            'zone': m.group(3),
            'x': float(m.group(4)),
            'y': float(m.group(5)),
            'side': m.group(6) or 'front',
            'dense': m.group(7) == 'true',
        }
        for m in LOCUS_RE.finditer(lblock.group(1))
    ]
    return loci, zones


# ------------------------------------------------------------------ construir bundle


def build_blocks(sec: dict) -> list[dict]:
    blocks: list[dict] = []
    th = sec['theory']
    if th['equivalent']:
        blocks.append({'type': 'note', 'md': f'**Equivalente en español.** {th["equivalent"]}'})
    if th['howto']:
        blocks.append(
            {
                'type': 'list',
                'items': [f'**{h["label"]}.** {h["value"]}' for h in th['howto']],
            }
        )
    if sec['variants']:
        blocks.append({'type': 'text', 'md': f'**Británico vs. americano.** {sec["variants"]}'})
    if sec['examples']:
        blocks.append(
            {
                'type': 'table',
                'caption': 'Ejemplos',
                'columns': ['Español', 'Inglés', 'Transcripción'],
                'rows': [[w['es'], w['en'], w['ipa']] for w in sec['examples']],
            }
        )
    if sec['patterns']:
        rows = []
        for g in sec['patterns']:
            for i, w in enumerate(g['words']):
                rows.append(
                    [
                        str(g['n']) if i == 0 else '',
                        g['pattern'] if i == 0 else '',
                        w['es'],
                        w['en'],
                        w['ipa'],
                    ]
                )
        blocks.append(
            {
                'type': 'table',
                'caption': 'Patrones del sonido',
                'columns': ['#', 'Patrón', 'Español', 'Inglés', 'Transcripción'],
                'rows': rows,
            }
        )
    if sec['restrictions']:
        blocks.append(
            {
                'type': 'table',
                'caption': 'Restricciones (excepciones)',
                'columns': ['Español', 'Inglés', 'Transcripción'],
                'rows': [[w['es'], w['en'], w['ipa']] for w in sec['restrictions']],
            }
        )
    if sec['pairs']:
        blocks.append(
            {
                'type': 'table',
                'caption': 'Minimal pairs',
                'columns': [
                    '#',
                    'Inglés',
                    'Transcripción',
                    'Español',
                    'Inglés',
                    'Transcripción',
                    'Español',
                ],
                'rows': [
                    [
                        p['n'],
                        p['a']['en'],
                        p['a']['ipa'],
                        p['a']['es'],
                        p['b']['en'],
                        p['b']['ipa'],
                        p['b']['es'],
                    ]
                    for p in sec['pairs']
                ],
            }
        )
    if sec['rhymes']:
        blocks.append(
            {
                'type': 'table',
                'caption': 'Rima / trabalenguas / poema',
                'columns': ['Inglés', 'Transcripción', 'Español'],
                'rows': [[r['en'], r['ipa'], r['es']] for r in sec['rhymes']],
            }
        )
    if sec['notes']:
        blocks.append({'type': 'note', 'md': '\n\n'.join(f'_{n}_' for n in sec['notes'])})
    return blocks


R10_INTERVALS = [
    {'value': 10, 'unit': 'min'},
    {'value': 1, 'unit': 'd'},
    {'value': 3, 'unit': 'd'},
    {'value': 7, 'unit': 'd'},
    {'value': 14, 'unit': 'd'},
    {'value': 30, 'unit': 'd'},
    {'value': 60, 'unit': 'd'},
    {'value': 90, 'unit': 'd'},
    {'value': 180, 'unit': 'd'},
    {'value': 365, 'unit': 'd'},
]

# Estilo del cuerpo de fonética: pc-data.js → BODIES, id 'f45'.
F45_STYLE = {
    'accent': 'hombros',
    'draw': 'neon',
    'skin': 'plano',
    'hair': 'curly',
    'hairColor': 'oklch(0.70 0.08 300)',
    'facial': 'none',
    'glasses': False,
    'detail': 'med',
    'vol': 'shade',
    'line': 'bold',
}

TEMPLATE = {
    'id': TEMPLATE_ID,
    'name': 'Fonética',
    'description': 'Un sonido del inglés anclado a una parte del cuerpo: cómo se produce, '
    'con qué patrones se escribe, sus restricciones y sus contrastes.',
    'fields': [
        {'key': 'routeNo', 'label': 'Nº de ruta', 'kind': 'number'},
        {'key': 'part', 'label': 'Parte del cuerpo', 'kind': 'text'},
        {'key': 'partEn', 'label': 'Parte en inglés', 'kind': 'text'},
        {'key': 'partIpa', 'label': 'Transcripción de la parte', 'kind': 'text'},
        {'key': 'sound', 'label': 'Símbolo del sonido', 'kind': 'text'},
        {'key': 'keyword', 'label': 'Palabra clave', 'kind': 'object'},
        {
            'key': 'comodin',
            'label': 'Comodín',
            'kind': 'object',
            'hint': 'Forma-número que recuerda cuántos patrones tiene el sonido.',
        },
        {'key': 'patternCount', 'label': 'Nº de patrones', 'kind': 'number'},
        {'key': 'links', 'label': 'Enlaces de diccionario', 'kind': 'object'},
        {'key': 'audio', 'label': 'Audios de la rima', 'kind': 'list'},
    ],
    'blockOrder': ['note', 'list', 'text', 'table'],
}


def build_bundle(sections: list[dict], loci_geo: list[dict], zones_geo: list[dict], stamp: str) -> dict:
    by_n = {s['n']: s for s in sections}
    zone_ids = {z['id'] for z in zones_geo}

    palaces = [
        {
            'id': PALACE_ID,
            'name': 'Fonética · Estándar 45',
            'kind': 'body_both',
            'style': F45_STYLE,
            'order': 2,
            'createdAt': stamp,
            'updatedAt': stamp,
        }
    ]
    zones = [
        {
            'id': f'zon-fonetica45-{z["id"]}',
            'palaceId': PALACE_ID,
            'name': z['name'],
            'color': z['id'],
            'order': z['order'],
        }
        for z in zones_geo
    ]
    loci, items, scene_objects = [], [], []

    for g in loci_geo:
        n = g['n']
        if g['zone'] not in zone_ids:
            warn(n, f'Zona «{g["zone"]}» no está en STD45_ZONES')
        locus_id = f'loc-fonetica45-{n:02d}'
        sec = by_n.get(n)
        locus = {
            'id': locus_id,
            'palaceId': PALACE_ID,
            'zoneId': f'zon-fonetica45-{g["zone"]}',
            'routeNo': n,
            'partName': g['name'],
            'side': g['side'],
            'pos': {'x': g['x'], 'y': g['y']},
        }
        if g['dense']:
            locus['dense'] = True
        if sec is None:
            locus['notes'] = (
                'Sin contenido: falta la sección correspondiente en '
                '«Guia_Fonetica 2026.docx».'
            )
            loci.append(locus)
            continue

        locus['anchor'] = {
            'text': f'{slash(sec["sound"])} · {sec["keyword"]["en"]}'
            if sec['keyword']
            else slash(sec['sound'])
        }
        loci.append(locus)

        pattern_count = len(sec['patterns'])
        comodin = sec['comodin']
        if comodin and comodin['n'] != pattern_count:
            warn(
                n,
                f'El comodín «{comodin["name"]}» ({comodin["n"]}) no coincide con '
                f'los {pattern_count} grupos de patrón encontrados',
            )
        if not comodin:
            warn(n, f'Sin línea de comodín (tiene {pattern_count} grupos de patrón)')
        if pattern_count == 0:
            warn(n, 'Sin tabla de patrones del sonido')

        order = 1
        if sec['keyword']:
            scene_objects.append(
                {
                    'id': f'sob-fonetica45-{n:02d}-{order}',
                    'locusId': locus_id,
                    'text': sec['keyword']['en'],
                    'represents': f'{slash(sec["sound"])} · {sec["keyword"]["es"]}',
                    'order': order,
                }
            )
            order += 1
        if comodin:
            scene_objects.append(
                {
                    'id': f'sob-fonetica45-{n:02d}-{order}',
                    'locusId': locus_id,
                    'text': comodin['name'],
                    'represents': f'{comodin["n"]} patrones de escritura',
                    'order': order,
                }
            )

        kw = sec['keyword']
        items.append(
            {
                'id': f'itm-fonetica45-{n:02d}',
                'locusId': locus_id,
                'deckId': DECK_ID,
                'templateId': TEMPLATE_ID,
                'title': f'{g["name"]} · {slash(sec["sound"])}',
                'front': f'{slash(sec["sound"])} — ¿cómo se produce y con qué patrones se escribe?',
                'back': f'{kw["en"]} {slash(kw["ipa"])} — {kw["es"]}' if kw else slash(sec['sound']),
                'blocks': build_blocks(sec),
                'tags': ['fonetica', g['zone']],
                'fields': {
                    'routeNo': n,
                    'part': sec['part'],
                    'partEn': sec['partEn'],
                    'partIpa': sec['partIpa'],
                    'sound': sec['sound'],
                    'soundRaw': sec['soundRaw'],
                    'keyword': kw,
                    'comodin': comodin,
                    'patternCount': pattern_count,
                    'comodinMatchesPatternCount': bool(comodin and comodin['n'] == pattern_count),
                    'links': sec['links'],
                    'audio': sec['audio'],
                },
                'priority': n,
                'origin': 'import',
                'createdAt': stamp,
                'updatedAt': stamp,
            }
        )

    extra = sorted(set(by_n) - {g['n'] for g in loci_geo})
    for n in extra:
        warn(n, 'El documento tiene una sección que no existe en la plantilla Estándar 45')

    return {
        'version': 1,
        'palaces': palaces,
        'zones': zones,
        'loci': loci,
        'sceneObjects': scene_objects,
        'items': items,
        'decks': [
            {
                'id': DECK_ID,
                'name': 'Fonética · 45 sonidos',
                'description': 'Los sonidos del inglés anclados al cuerpo, de la cabeza a los pies.',
                'templateId': TEMPLATE_ID,
                'scheduleId': SCHEDULE_ID,
            }
        ],
        'templates': [TEMPLATE],
        'schedules': [
            {
                'id': SCHEDULE_ID,
                'name': 'R10',
                'mode': 'checkpoints',
                'intervals': R10_INTERVALS,
                'rules': {
                    'againAction': 'reset',
                    'hardFactor': 0.5,
                    'easySkip': 2,
                    'minInterval': {'value': 10, 'unit': 'min'},
                    'dayStartHour': 8,
                },
            }
        ],
    }


# ------------------------------------------------------------------------- informe


def write_report(path: Path, bundle: dict, sections: list[dict], docx: Path) -> None:
    items = bundle['items']
    loci = bundle['loci']
    rows3 = sum(len(s['examples']) + len(s['restrictions']) for s in sections)
    rows5 = sum(len(g['words']) for s in sections for g in s['patterns'])
    pairs = sum(len(s['pairs']) for s in sections)
    links = sum(len(s['links']) for s in sections)

    by_section: dict[int | None, list[str]] = {}
    for n, msg in anomalies:
        by_section.setdefault(n, []).append(msg)

    lines = [
        '# Informe de ingesta · Fonética · Estándar 45',
        '',
        '> Generado por `scripts/ingest_fonetica.py`. **No editar a mano**: se regenera con',
        '> `npm run seed:fonetica`.',
        '',
        f'- Documento de origen: `{rel_to_root(docx)}`',
        f'- Secciones leídas: **{len(sections)}**',
        f'- Puntos del palacio: **{len(loci)}** · ítems creados: **{len(items)}**',
        f'- Filas de ejemplos y restricciones: **{rows3}**',
        f'- Palabras en tablas de patrones: **{rows5}** '
        f'(en {sum(len(s["patterns"]) for s in sections)} grupos)',
        f'- Minimal pairs: **{pairs}**',
        f'- Enlaces de diccionario indexados: **{links}**',
        f'- Anomalías registradas: **{len(anomalies)}**',
        '',
        '## Puntos sin contenido',
        '',
    ]
    empty = [l for l in loci if not any(i['locusId'] == l['id'] for i in items)]
    if empty:
        for l in empty:
            lines.append(f'- **{l["routeNo"]} · {l["partName"]}** — {l.get("notes", "")}')
    else:
        lines.append('Ninguno: los 45 puntos tienen ítem.')

    lines += ['', '## Contenido por sección', '']
    lines.append(
        '| # | Parte | Sonido | Clave | Comodín | Patrones | Pasos | Ejemplos | Restr. | '
        'Pairs | Rima |'
    )
    lines.append('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for s in sections:
        com = f'{s["comodin"]["name"]} ({s["comodin"]["n"]})' if s['comodin'] else '—'
        flag = '' if not s['comodin'] or s['comodin']['n'] == len(s['patterns']) else ' ⚠'
        kw = s['keyword']['en'] if s['keyword'] else '—'
        lines.append(
            f'| {s["n"]} | {s["part"]} | `{s["sound"]}` | {kw} | {com}{flag} | '
            f'{len(s["patterns"])} | {len(s["theory"]["howto"])} | {len(s["examples"])} | '
            f'{len(s["restrictions"])} | {len(s["pairs"])} | {len(s["rhymes"])} |'
        )

    lines += ['', '## Anomalías', '']
    if not anomalies:
        lines.append('Ninguna.')
    for n in sorted(by_section, key=lambda k: (k is None, k or 0)):
        head = f'### Sección {n}' if n is not None else '### Generales'
        lines.append(head)
        lines.append('')
        for msg in by_section[n]:
            lines.append(f'- {msg}')
        lines.append('')

    lines += [
        '## Notas de conversión',
        '',
        '- Los glifos IPA en mayúscula del documento (`/Ɔ:/`, `/Ʌ/`, `/W/`, `/Ʊ/`…) se',
        '  normalizan a IPA estándar en `fields.sound`; el original queda en `fields.soundRaw`.',
        '- El apartado «Excepciones» del Word se publica como bloque **«Restricciones',
        '  (excepciones)»**, que es como lo llama el usuario.',
        '- El comodín de cada sonido codifica **cuántos patrones de escritura** tiene. Donde no',
        '  cuadra con los grupos encontrados queda marcado con ⚠ en la tabla de arriba.',
        '- La geometría (coordenadas, lados, puntos densos y zonas) sale de `STD45` y',
        '  `STD45_ZONES` en `design_handoff_palacio_corporal/pc-data.js`. El array `PH` de ese',
        '  mismo archivo asigna los sonidos a los puntos **en otro orden**: era dato de ejemplo',
        '  del prototipo y manda el Word.',
        '',
    ]
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


# ----------------------------------------------------------------------------- main


def main() -> int:
    # La consola de Windows usa cp1252: sin esto, los símbolos IPA la rompen.
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--docx', default=str(ROOT / 'documentación' / 'Guia_Fonetica 2026.docx'))
    ap.add_argument('--pc-data', default=str(ROOT / 'design_handoff_palacio_corporal' / 'pc-data.js'))
    ap.add_argument('--out', default=str(ROOT / 'seed' / 'fonetica45.json'))
    ap.add_argument('--report', default=str(ROOT / 'docs' / 'INGESTA_FONETICA.md'))
    args = ap.parse_args()

    docx = Path(args.docx)
    if not docx.exists():
        print(f'No existe el documento: {docx}', file=sys.stderr)
        return 1

    body, rels = read_docx(docx)
    sections = split_sections(body)
    loci_geo, zones_geo = read_std45(Path(args.pc_data))

    for sec in sections:
        content = sec['content']
        links: dict[str, str] = {}
        sec['links'] = links
        sec['examples'] = []
        sec['restrictions'] = []
        sec['patterns'] = []
        sec['pairs'] = []

        pron = [t for k, t, _ in content.get('pron', []) if k == 'p']
        pron += [t for k, t, _ in content.get('equiv', []) if k == 'p']
        sec['theory'] = parse_theory(pron)
        sec['variants'] = ' '.join(t for k, t, _ in content.get('variants', []) if k == 'p')
        sec['rhymes'], sec['audio'] = parse_rhymes(content.get('rhymes', []), rels)

        target_by_sub = {
            'examples': 'examples',
            'restrictions': 'restrictions',
            'patterns': 'patterns',
            'pairs': 'pairs',
        }
        for sub, entries in content.items():
            for kind, _, el in entries:
                if kind != 'tbl':
                    continue
                shape = classify_table(el)
                if shape in ('words', 'words-noes'):
                    bucket = 'restrictions' if sub == 'restrictions' else 'examples'
                    sec[bucket] += parse_words(el, rels, links, with_es=shape == 'words')
                elif shape == 'patterns':
                    sec['patterns'] += parse_patterns(el, rels, links, sec['n'])
                elif shape == 'pairs':
                    sec['pairs'] += parse_pairs(el, rels, links)
                else:
                    rows = el.findall(W + 'tr')
                    ncol = len(cells_of(rows[0])) if rows else 0
                    warn(
                        sec['n'],
                        f'Tabla de forma desconocida en «{sub}» '
                        f'({len(rows)} filas × {ncol} columnas): no se importó',
                    )
                if shape in ('words', 'words-noes', 'patterns', 'pairs') and sub not in target_by_sub:
                    warn(sec['n'], f'Tabla de tipo «{shape}» encontrada bajo «{sub}»')

        if not sec['keyword']:
            warn(sec['n'], 'Sin línea «Palabra clave:»')
        if not sec['theory']['equivalent'] and not sec['theory']['howto']:
            warn(sec['n'], 'Sin texto de pronunciación ni equivalente en español')
        if not sec['pairs']:
            warn(sec['n'], 'Sin tabla de minimal pairs')

    stamp = (
        dt.datetime.fromtimestamp(docx.stat().st_mtime, dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace('+00:00', 'Z')
    )
    bundle = build_bundle(sections, loci_geo, zones_geo, stamp)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    write_report(Path(args.report), bundle, sections, docx)

    print(f'Secciones leídas:      {len(sections)}')
    print(f'Puntos / ítems:        {len(bundle["loci"])} / {len(bundle["items"])}')
    print(f'Objetos de escena:     {len(bundle["sceneObjects"])}')
    print(f'Grupos de patrón:      {sum(len(s["patterns"]) for s in sections)}')
    print(f'Palabras de patrón:    {sum(len(g["words"]) for s in sections for g in s["patterns"])}')
    print(f'Ejemplos / restricc.:  {sum(len(s["examples"]) for s in sections)}'
          f' / {sum(len(s["restrictions"]) for s in sections)}')
    print(f'Minimal pairs:         {sum(len(s["pairs"]) for s in sections)}')
    print(f'Enlaces indexados:     {sum(len(s["links"]) for s in sections)}')
    print(f'Anomalías:             {len(anomalies)}')
    print(f'→ {rel_to_root(out)}')
    print(f'→ {rel_to_root(Path(args.report))}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
