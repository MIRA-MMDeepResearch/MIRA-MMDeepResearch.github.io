#!/usr/bin/env python3
r"""Convert one showcase report (the paper's annotated LaTeX) into an HTML fragment
for the interactive report reader.

usage: tex2html.py REPORT.tex IMG_WEB_PREFIX OUT.html [OUT.json]
Markup understood: \rtitle \rsec \rnote \clue \fact \rcite \rimgref \rtrace \rimagebox
\rbox, the rlist of references, \rimgsources/\rimgsrc and \rgate.
"""
import html, json, re, sys

BLOCK_CMDS = ('\\rtitle', '\\rsec', '\\rnote', '\\rtrace', '\\rimagebox',
              '\\begin{rlist}', '\\rimgsources', '\\rgate')


def read_group(s, i):
    """s[i] == '{' -> (content, index after the closing brace)."""
    assert s[i] == '{', (i, s[i:i + 20])
    depth, j = 0, i
    while j < len(s):
        c = s[j]
        if c == '\\':
            j += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    raise ValueError('unbalanced brace at %d' % i)


def read_groups(s, i, n):
    out = []
    for _ in range(n):
        while i < len(s) and s[i] in ' \n':
            i += 1
        g, i = read_group(s, i)
        out.append(g)
    return out, i


SIMPLE = [
    ('\\textasciitilde{}', '~'), ('\\(\\rightarrow\\)', '\u2192'), ('\\(\\times\\)', '\u00d7'),
    ('\\ldots', '\u2026'), ('\\,', '\u2009'), ('\\%', '%'), ('\\_', '_'), ('\\&', '&amp;'),
    ('---', '\u2014'), ('--', '\u2013'), ('``', '\u201c'), ("''", '\u201d'),
]


def math_inline(m):
    """A small subset of inline LaTeX math: greek letters, sub/superscripts, operators, single-letter variables."""
    for a, b in (('\\rightarrow', '\u2192'), ('\\times', '\u00d7'), ('\\cdot', '\u00b7'), ('\\delta', '\u03b4'),
                 ('\\omega', '\u03c9'), ('\\sim', '~'), ('\\ldots', '\u2026'), ('\\,', '\u2009')):
        m = m.replace(a, b)
    m = re.sub(r'\^\{([^}]*)\}', r'<sup>\1</sup>', m)
    m = re.sub(r'\^(\w)', r'<sup>\1</sup>', m)
    m = re.sub(r'_\{([^}]*)\}', r'<sub>\1</sub>', m)
    m = re.sub(r'_(\w)', r'<sub>\1</sub>', m)
    m = m.replace('-', '\u2212')
    m = re.sub(r'(?<![<\w/&#])([a-zA-Z])(?![\w>;])', r'<i>\1</i>', m)
    return m.strip()


def inline(s):
    s = html.escape(s, quote=False)
    for a, b in SIMPLE:
        s = s.replace(a, b)
    s = re.sub(r'\\textsubscript\{([^{}]*)\}', r'<sub>\1</sub>', s)
    s = re.sub(r'\\textsuperscript\{([^{}]*)\}', r'<sup>\1</sup>', s)
    s = re.sub(r'\\textperthousand(\{\})?', '\u2030', s)
    s = re.sub(r'\\textendash(\{\})?', '\u2013', s)
    s = re.sub(r'\\textdegree(\{\})?', '\u00b0', s)
    s = re.sub(r'\\\((.*?)\\\)', lambda m: math_inline(m.group(1)), s)
    s = s.replace('{\\color{rframe}\\textbf{WARN}}', '<b class="gate-warn">WARN</b>')
    s = s.replace('{\\color{tok}\\textbf{OK}}', '<b class="gate-ok">OK</b>')
    s = re.sub(r'\\rcite\{(\d+)\}', r'<a class="cite" href="#ref-\1" data-ref="\1">[\1]</a>', s)
    s = re.sub(r'\\rimgref\{(\d+)\}', r'<a class="imgref" href="#img-\1" data-img="\1">Image \1</a>', s)
    tags = {'clue': ('<mark class="clue">', '</mark>'), 'fact': ('<mark class="fact">', '</mark>'),
            'textbf': ('<b>', '</b>'), 'emph': ('<em>', '</em>'), 'texttt': ('<code>', '</code>')}
    pat = re.compile(r'\\(clue|fact|textbf|emph|texttt)\{([^{}]*)\}')
    while True:
        s2 = pat.sub(lambda m: tags[m.group(1)][0] + m.group(2) + tags[m.group(1)][1], s)
        if s2 == s:
            break
        s = s2
    s = s.replace('~', '&nbsp;')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def parse(src):
    doc = {'title': '', 'sections': [], 'references': [], 'ref_notes': [], 'image_sources': [], 'gate': []}
    i, n = 0, len(src)
    cur = None
    pending_trace = None
    img_no = 0
    para = []

    in_refs = False

    def add_ref(item):
        m = re.match(r'\s*(?:\\rcite\{(\d+)\})?\s*(.*?)\\rurl\{([^}]*)\}\s*(?:[-\u2013]\s*)?(.*)$', item.strip(), re.S)
        if not m:
            return False
        n = int(m.group(1)) if m.group(1) else len(doc['references']) + 1
        title = inline(m.group(2))
        if m.group(4).strip():
            title += ' \u2013 ' + inline(m.group(4))
        doc['references'].append({'n': n, 'title': title, 'url': m.group(3).strip()})
        return True

    def flush():
        nonlocal para
        text = ' '.join(para).strip()
        if text and in_refs and '\\rurl{' in text:
            add_ref(text)
        elif text and cur is not None:
            cur['blocks'].append({'type': 'p', 'html': inline(text)})
        para = []

    def new_section(title):
        nonlocal cur
        flush()
        cur = {'title': inline(title), 'notes': [], 'blocks': []}
        doc['sections'].append(cur)

    while i < n:
        # skip blank lines -> paragraph break
        m = re.match(r'[ \t]*\n', src[i:])
        if m:
            flush()
            i += m.end()
            continue
        if src.startswith('\\rtitle', i):
            (t,), i = read_groups(src, i + 7, 1)
            doc['title'] = inline(t)
            new_section('')
            continue
        if src.startswith('\\rsec', i):
            (t,), i = read_groups(src, i + 5, 1)
            if t.strip().lower() == 'references':   # the reference list is rendered from the items below
                flush()
                in_refs = True
                cur = {'title': '', 'notes': [], 'blocks': []}   # detached: ordinary text here is dropped
                continue
            new_section(t)
            continue
        if src.startswith('\\rnote', i):
            (t,), i = read_groups(src, i + 6, 1)
            (doc['ref_notes'] if in_refs else cur['notes']).append(inline(t))
            continue
        if src.startswith('\\rtrace', i):
            (a, b), i = read_groups(src, i + 7, 2)
            turns = [int(x) for x in re.findall(r'turn (\d+)', a)]
            parts = [inline(p) for p in b.split('\\par')]
            pending_trace = {'label': inline(a), 'turns': turns, 'source': parts[0],
                             'why': re.sub(r'^<b>Why it was used\.</b>\s*', '', parts[1]) if len(parts) > 1 else ''}
            continue
        if src.startswith('\\rimagebox', i):
            (path, cap, boxes), i = read_groups(src, i + 10, 3)
            img_no += 1
            bx = [[float(a), float(b), float(c), float(d), inline(e)]
                  for a, b, c, d, e in re.findall(r'\\rbox\{([\d.]+)\}\{([\d.]+)\}\{([\d.]+)\}\{([\d.]+)\}\{([^}]*)\}', boxes)]
            flush()
            cur['blocks'].append({'type': 'figure', 'n': img_no, 'file': path.split('/')[-1],
                                  'caption': inline(cap), 'boxes': bx, 'trace': pending_trace})
            pending_trace = None
            continue
        if src.startswith('\\begin{rlist}', i):
            j = src.index('\\end{rlist}', i)
            body = src[i + len('\\begin{rlist}'):j]
            for item in body.split('\\item')[1:]:
                add_ref(item)
            i = j + len('\\end{rlist}')
            flush()
            continue
        if src.startswith('\\begin{renum}', i):
            j = src.index('\\end{renum}', i)
            flush()
            items = [inline(x) for x in src[i + len('\\begin{renum}'):j].split('\\item')[1:]]
            cur['blocks'].append({'type': 'ol', 'items': items})
            i = j + len('\\end{renum}')
            continue
        if src.startswith('\\rimgsources', i):
            (body,), i = read_groups(src, i + 12, 1)
            for imgs, title, url in re.findall(r'\\rimgsrc\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}', body):
                doc['image_sources'].append({'images': inline(imgs), 'title': inline(title), 'url': url.strip()})
            continue
        if src.startswith('\\rgate', i):
            (body,), i = read_groups(src, i + 6, 1)
            for item in body.split('\\item')[1:]:
                t = inline(item)
                m = re.search(r'turn (\d+)', t)
                doc['gate'].append({'turn': int(m.group(1)) if m else None, 'html': t,
                                    'ok': 'gate-ok' in t})
            continue
        # ordinary text up to end of line
        j = src.find('\n', i)
        if j < 0:
            j = n
        para.append(src[i:j])
        i = j + 1
    flush()
    return doc


def render(doc, img_prefix, dims=None):
    out = []
    out.append('<header class="rd-head"><h3 class="rd-title">%s</h3></header>' % doc['title'])
    cite_first = {}
    for si, sec in enumerate(doc['sections']):
        if not sec['blocks'] and not sec['notes']:
            continue
        out.append('<section class="rd-sec" id="rd-sec-%d">' % si)
        if sec['title']:
            out.append('<h4>%s</h4>' % sec['title'])
        for note in sec['notes']:
            note = re.sub(r'\[(\d+)\]', r'<a class="cite" href="#ref-\1" data-ref="\1">[\1]</a>', note)
            out.append('<aside class="rd-note" data-layer="note"><span class="rd-note-tag">Paper note</span> %s</aside>' % note)
        for b in sec['blocks']:
            if b['type'] == 'p':
                out.append('<p>%s</p>' % b['html'])
            elif b['type'] == 'ol':
                out.append('<ol class="rd-list">%s</ol>' % ''.join('<li>%s</li>' % x for x in b['items']))
            else:
                tr = b['trace'] or {}
                turns = ','.join(str(t) for t in tr.get('turns', []))
                # \rbox coordinates are fractions with the origin at the image's bottom-left corner
                boxes = ''.join('<i class="rd-box" style="left:%.1f%%;top:%.1f%%;width:%.1f%%;height:%.1f%%"></i>'
                                % (x0 * 100, (1 - y1) * 100, (x1 - x0) * 100, (y1 - y0) * 100) for x0, y0, x1, y1, _ in b['boxes'])
                out.append('<figure class="rd-fig" id="img-%d" data-img="%d" data-turns="%s">' % (b['n'], b['n'], turns))
                out.append('<button type="button" class="rd-imgwrap" aria-label="Open image %d full size"><img src="%s%s" alt="%s"%s decoding="async">%s</button>'
                           % (b['n'], img_prefix, b['file'], html.escape(re.sub('<[^>]+>', '', b['caption'])),
                              ' width="%d" height="%d"' % dims[b['file']] if dims and b['file'] in dims else '', boxes))
                out.append('<figcaption><span class="rd-fign">Image %d</span> %s</figcaption>' % (b['n'], b['caption']))
                if tr:
                    out.append('<div class="rd-trace" data-layer="trace" data-turns="%s"><span class="rd-trace-tag">Trace</span> <span class="rd-trace-label">%s</span>'
                               '<div class="rd-trace-body"><p>%s</p><p><b>Why it was used.</b> %s</p></div></div>' % (turns, tr['label'], tr['source'], tr['why']))
                out.append('</figure>')
        out.append('</section>')
    out.append('<section class="rd-sec rd-refs"><h4>References</h4>')
    for note in doc['ref_notes']:
        note = re.sub(r'\[(\d+)\]', r'<a class="cite" href="#ref-\1" data-ref="\1">[\1]</a>', note)
        out.append('<aside class="rd-note rd-refnote" data-layer="note"><span class="rd-note-tag">Paper note</span> %s</aside>' % note)
    out.append('<ol class="rd-reflist">')
    for r in doc['references']:
        out.append('<li id="ref-%d" data-ref="%d"><span class="rd-refn">[%d]</span> <a href="%s" target="_blank" rel="noopener">%s</a><span class="rd-refurl">%s</span></li>'
                   % (r['n'], r['n'], r['n'], html.escape(r['url']), r['title'], html.escape(r['url'])))
    out.append('</ol>')
    if doc['image_sources']:
        out.append('<p class="rd-imgsrc"><b>Image sources.</b> ' + ' '.join(
            '%s: <a href="%s" target="_blank" rel="noopener">%s</a>.' % (s['images'], html.escape(s['url']), s['title']) for s in doc['image_sources']) + '</p>')
    out.append('</section>')
    if doc['gate']:
        out.append('<section class="rd-sec rd-gate"><h4>Report gate</h4><ul>')
        for g in doc['gate']:
            out.append('<li data-turn="%s" class="%s">%s</li>' % (g['turn'], 'ok' if g['ok'] else 'warn', g['html']))
        out.append('</ul></section>')
    return '\n'.join(out)


if __name__ == '__main__':
    src = open(sys.argv[1], encoding='utf-8').read()
    doc = parse(src)
    frag = render(doc, sys.argv[2])
    open(sys.argv[3], 'w', encoding='utf-8').write(frag)
    if len(sys.argv) > 4:
        json.dump(doc, open(sys.argv[4], 'w'), ensure_ascii=False, indent=1)
    print('sections', len(doc['sections']), 'refs', len(doc['references']), 'gate', len(doc['gate']),
          'figures', sum(1 for s in doc['sections'] for b in s['blocks'] if b['type'] == 'figure'), file=sys.stderr)
