#!/usr/bin/env python3
"""Build the MIRA project page.

Layouts, detected from where this file lives:
  repository:  src/  data/  assets/  tools/            ->  index.html
  workspace:   site/src  site/assets  data/  case/     ->  site/live.html (full page), site/index.html (artifact
                                                           fragment, no document skeleton), site/_local.html (preview)

Inputs: data/table.json (main results), data/traces.json (compact tool-call traces, run stats and the request of
each case study; regenerated from case/.../trajectory.json whenever those raw runs are present), data/reports/*.tex
(the paper's annotated report appendix), assets/reports/<case>/*.jpg (the images those reports cite).
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from tex2html import parse, render          # noqa: E402

WORKSPACE = os.path.isdir(os.path.join(ROOT, 'site', 'src'))
SRC = os.path.join(ROOT, 'site', 'src') if WORKSPACE else os.path.join(ROOT, 'src')
ASSETS = os.path.join(ROOT, 'site', 'assets') if WORKSPACE else os.path.join(ROOT, 'assets')
DATA = os.path.join(ROOT, 'data')
OUT_LIVE = os.path.join(ROOT, 'site', 'live.html') if WORKSPACE else os.path.join(ROOT, 'index.html')
OUT_FRAG = os.path.join(ROOT, 'site', 'index.html') if WORKSPACE else None

TITLE = 'MIRA: A Multimodal Illustrated Deep Research Agent for Controllable Reports'
DESCRIPTION = ('MIRA is a multimodal deep research agent that writes controllable, illustrated reports with traceable '
               'textual and visual evidence. Paper, code, model weights and data.')
SITE = 'https://mira-mmdeepresearch.github.io/'

# ---------- main results chart ----------
table = json.load(open(os.path.join(DATA, 'table.json')))
header = table[0]['cells']
benchmarks = header[2:]
rows = {r['cells'][0]: r['cells'] for r in table[1:] if r['cls'] not in ('group', 'delta')}
SERIES = [('MIRA-SFT', 'MIRA-SFT (ours)', '#DA291C', True),
          ('Qwen3.6 w/ Vanilla Harness', 'Qwen3.6-35B-A3B', 'var(--grey-1)', False),
          ('WeAgent-MMSearch', 'WeAgent-MMSearch', 'var(--grey-2)', False),
          ('OpenSearch-VL', 'OpenSearch-VL', 'var(--grey-3)', False),
          ('DeepSeek-V4.1-Flash', 'DeepSeek-V4.1-Flash', 'var(--grey-4)', False),
          ('Kimi-K3', 'Kimi-K3', 'var(--grey-5)', False)]
series = []
for key, label, color, ours in SERIES:
    cells = rows[key][2:]
    series.append({'key': key, 'label': label, 'color': color, 'ours': ours,
                   'values': [None if c in ('–', '') else float(c) for c in cells]})

# ---------- pipeline figures: step boxes in % of the image ----------
steps = {
  'harness': [
    {'n': 0, 't': 'Request becomes a contract', 'd': 'Query + report mode set granularity, composition and grounding.', 'box': [0, 0, 100, 15.5]},
    {'n': 1, 't': 'Evidence collection', 'd': 'Search, Open, Find and Python fill the evidence workspace.', 'box': [0, 19.5, 29.6, 80.5]},
    {'n': 2, 't': 'Report submission', 'd': 'An illustrated draft is submitted with its evidence.', 'box': [31.4, 19.5, 23.2, 80.5]},
    {'n': 3, 't': 'Feedback-driven revision', 'd': 'The report gate judges the draft; unmet conditions come back as warnings.', 'box': [56.4, 19.5, 25.7, 80.5]},
    {'n': 4, 't': 'Final delivery', 'd': 'The approved report ships in the requested mode.', 'box': [84.2, 19.5, 15.8, 80.5]},
  ],
  'data': [
    {'n': 1, 't': 'Curating query seeds', 'd': 'Topic seeds become a user request plus an internal rubric.', 'box': [0, 0, 31.6, 100]},
    {'n': 2, 't': 'Harness-native synthesis', 'd': 'A teacher runs inside MIRA-Harness; drafts must pass both gates.', 'box': [34.2, 0, 35.1, 100]},
    {'n': 3, 't': 'Capability-balanced mixture', 'd': 'Accepted trajectories are mixed with general search data.', 'box': [71.8, 0, 28.2, 100]},
  ],
}

# ---------- case studies ----------
CASES = [
  {'id': 'concrete', 'title': 'Roman maritime concrete', 'tab': 'Roman concrete',
   'kicker': 'Case 1 of 3 · Paper appendix D.1–D.2',
   'traj': 'case/1_run1_noproxy_q0458_02/q0458_02_%s/trajectory.json'},
  {'id': 'cam', 'title': 'CAM photosynthesis in desert plants', 'tab': 'CAM photosynthesis',
   'kicker': 'Case 2 of 3 · Paper appendix D.3',
   'traj': 'case/cam/%s/trajectory.json'},
  {'id': 'traffic', 'title': 'Traffic-flow visualization in engineering teaching', 'tab': 'Traffic flow',
   'kicker': 'Case 3 of 3 · Additional run, same harness and model',
   'traj': 'case/traffic/%s/trajectory.json'},
]
MODES = ('concise', 'detail')


def image_size(path):
    """(width, height) of a PNG or JPEG without any imaging library."""
    import struct
    data = open(path, 'rb').read()
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    assert data[:2] == b'\xff\xd8', path
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker == 0xFF:   # fill bytes before a marker (T.81 B.1.1.2)
            i += 1
            continue
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seg = struct.unpack('>H', data[i + 2:i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return (w, h)
        i += 2 + seg
    raise ValueError(path)
traces_path = os.path.join(DATA, 'traces.json')
if all(os.path.exists(os.path.join(ROOT, c['traj'] % m)) for c in CASES for m in MODES):
    from traj2json import convert       # noqa: E402
    traces = {}
    for c in CASES:
        trace, runs, question = convert(*(os.path.join(ROOT, c['traj'] % m) for m in MODES))
        traces[c['id']] = {'trace': trace, 'runs': runs, 'question': question}
    json.dump(traces, open(traces_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('traces.json regenerated from the raw trajectories', file=sys.stderr)
else:
    traces = json.load(open(traces_path, encoding='utf-8'))

cases = []
for c in CASES:
    t = traces[c['id']]
    report = {}
    for m in MODES:
        doc = parse(open(os.path.join(DATA, 'reports', '%s_%s.tex' % (c['id'], m)), encoding='utf-8').read())
        figs = [b for s in doc['sections'] for b in s['blocks'] if b['type'] == 'figure']
        dims = {}
        for b in figs:
            p = os.path.join(ASSETS, 'reports', c['id'], b['file'])
            assert os.path.exists(p), p
            dims[b['file']] = image_size(p)   # width/height attributes keep the paginated reader stable before the images load
        assert doc['references'], 'no references parsed for %s %s' % (c['id'], m)
        report[m] = {'html': render(doc, 'assets/reports/%s/' % c['id'], dims), 'images': len(figs), 'refs': len(doc['references'])}
    cases.append({'id': c['id'], 'title': c['title'], 'tab': c['tab'], 'kicker': c['kicker'], 'question': t['question'],
                  'runs': t['runs'], 'trace': t['trace'], 'report': report})
    print(c['id'], t['runs'], {m: (report[m]['images'], report[m]['refs']) for m in MODES}, file=sys.stderr)

# ---------- assemble ----------
# the terminal above the Abstract replays two recorded runs; tools/terminal2json.py wrote this from their trajectories
terminal = json.load(open(os.path.join(DATA, 'terminal.json'), encoding='utf-8'))
for r in terminal.values():
    for p in r['thumbs'].values():
        assert os.path.exists(os.path.join(ROOT, p)), p
data = {'table': table, 'chart': {'benchmarks': benchmarks, 'series': series}, 'steps': steps, 'cases': cases, 'terminal': terminal}
js = open(os.path.join(SRC, 'app.js'), encoding='utf-8').read().replace('{{DATA}}', json.dumps(data, ensure_ascii=False))
assert '</script' not in js
body = open(os.path.join(SRC, 'body.html'), encoding='utf-8').read()
assert '{{' not in body
head = open(os.path.join(SRC, 'head.html'), encoding='utf-8').read()


# desktop scale: every length in a declaration block becomes calc(Npx * var(--k)); --k is 1, and .85 from 1100px up (see head.html).
# Media query conditions sit outside the blocks and keep their px; so do 0-2px hairlines, and the text sizes of SVG rules (a rule with a
# fill), which already scale with their viewBox
PX = re.compile(r'(?<![\w.])(-?\d*\.?\d+)px\b')


def scale_block(m):
    block = m.group(0)
    svg = 'fill:' in block

    def one(n):
        if abs(float(n.group(1))) <= 2 or (svg and re.search(r'font-size:\s*$', block[:n.start()])):
            return n.group(0)
        return 'calc(%spx * var(--k))' % n.group(1)
    return PX.sub(one, block)


a, b = head.index('<style>'), head.index('</style>')
assert head.count('<style>') == 1 and head[a:b].count('{') == head[a:b].count('}')
head = head[:a] + re.sub(r'\{[^{}]*\}', scale_block, head[a:b]) + head[b:]
# the terminal's own stylesheet gets the same scale; app.js moves the template into a shadow root, which --k reaches by inheritance
term = open(os.path.join(SRC, 'terminal.html'), encoding='utf-8').read()
a, b = term.index('<style>'), term.index('</style>')
assert term.count('<style>') == 1 and term[a:b].count('{') == term[a:b].count('}') and body.count('<!-- terminal -->') == 1
body = body.replace('<!-- terminal -->', term[:a] + re.sub(r'\{[^{}]*\}', scale_block, term[a:b]) + term[b:])
for name in sorted(os.listdir(os.path.join(ASSETS, 'img'))):      # the mascot's mask layers travel inside the stylesheet
    if name.startswith('wm_') and name.endswith('.png'):
        ref = 'url("assets/img/%s")' % name
        assert head.count(ref) == 1, ref
        head = head.replace(ref, 'url("data:image/png;base64,%s")' % base64.b64encode(open(os.path.join(ASSETS, 'img', name), 'rb').read()).decode())
assert 'assets/img/wm_' not in head
head_lines = head.split('\n')
assert head_lines[0].startswith('<title>') and 'claude:viewport-fit-sides' in head_lines[1], head_lines[:2]


def check(out):
    for banned in ('of 8', 'of eight', 'seven of', 'eight benchmarks', '7 of '):
        assert banned not in out, 'banned phrase in page: %r' % banned


# the public page: a complete document, the single look, no demo controls
LOOK_PICKER = re.compile(r'\n<div class="looks".*?</div>\n', re.S)
assert LOOK_PICKER.search(body)
live_body = LOOK_PICKER.sub('\n', body)
live_js = js.replace("try { look = localStorage.getItem('mira-look') || look; } catch (e) {}\n", '')
assert live_js != js
live_head = '\n'.join(head_lines[2:])
live = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<title>%s</title>\n<meta name="description" content="%s">\n<meta name="color-scheme" content="light dark">\n'
        '<link rel="icon" type="image/png" sizes="512x512" href="assets/img/logo_512.png">\n'
        '<link rel="apple-touch-icon" href="assets/img/logo_512.png">\n<link rel="canonical" href="%s">\n'
        '<meta property="og:type" content="website">\n<meta property="og:title" content="%s">\n'
        '<meta property="og:description" content="%s">\n<meta property="og:url" content="%s">\n'
        '<meta property="og:image" content="%sassets/img/harness_overview.png">\n<meta name="twitter:card" content="summary_large_image">\n'
        '<style>body{margin:0}img{max-width:100%%;height:auto}[hidden]{display:none!important}</style>\n'
        % (TITLE, DESCRIPTION, SITE, TITLE, DESCRIPTION, SITE, SITE)
        + live_head + '\n</head>\n<body>\n' + live_body + '\n<script>\n' + live_js + '\n</script>\n</body>\n</html>\n')
check(live)
open(OUT_LIVE, 'w', encoding='utf-8').write(live)
print('wrote', os.path.relpath(OUT_LIVE, ROOT), len(live), 'bytes', file=sys.stderr)

if OUT_FRAG:
    # the review artifact: the host wraps this fragment in its own skeleton; the look picker stays for comparison
    frag = head + '\n' + body + '\n<script>\n' + js + '\n</script>\n'
    check(frag)
    open(OUT_FRAG, 'w', encoding='utf-8').write(frag)
    local = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
             '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
             + frag + '</body></html>')
    open(os.path.join(ROOT, 'site', '_local.html'), 'w', encoding='utf-8').write(local)
    print('wrote site/index.html', len(frag), 'bytes', file=sys.stderr)
