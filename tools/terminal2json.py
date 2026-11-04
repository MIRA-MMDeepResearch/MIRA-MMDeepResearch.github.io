#!/usr/bin/env python3
"""Turn recorded MIRA-Harness runs into the script the page's terminal replays.

usage: terminal2json.py KEY=RUN_DIR [KEY=RUN_DIR ...]      (writes data/terminal.json and assets/img/terminal/*.jpg)
RUN_DIR holds a run's trajectory.json and images/. Every line the terminal prints comes from the run: the slash command
and request, each tool call with its argument, a short summary of what the tool returned, the model's thinking time per
turn, and the report gate's checks and issues. Thumbnails are the run's own images, shrunk with macOS sips.
The page's runs: concrete = q0458_02_concise (candidates/1_run1_noproxy_q0458_02), traffic = q0437_06_detail (traffic_flow/detail).
"""
import json, os, re, subprocess, sys
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THUMBS = os.path.join(ROOT, 'assets', 'img', 'terminal')


def host(u):
    h = urlparse(u).netloc
    return h[4:] if h.startswith('www.') else h


def short_url(u, n=64):
    s = re.sub(r'^https?://(www\.)?', '', u).rstrip('/')
    return s if len(s) <= n else s[:n - 1] + '…'


def clip(s, n):
    s = ' '.join((s or '').split())
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


def thumb(src, name, px=200):
    """A small JPEG of the run's image; returns its path relative to the page."""
    os.makedirs(THUMBS, exist_ok=True)
    out = os.path.join(THUMBS, name + '.jpg')
    if not os.path.exists(out):
        subprocess.run(['sips', '-Z', str(px), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', out], check=True, capture_output=True)
    return os.path.relpath(out, ROOT)


def run(key, path):
    d = json.load(open(os.path.join(path, 'trajectory.json')))
    msgs = d['messages']
    cmd, _, question = msgs[1]['content'].partition('\n')
    returns = {m['tool_call_id']: m['content'] for m in msgs if m['role'] == 'tool'}
    think = {e['turn']: e['seconds'] for e in d['events'] if e.get('event') == 'model_response'}
    tool_secs = {}
    for e in d['events']:
        if e.get('event') == 'tool_result':
            tool_secs[e['turn']] = tool_secs.get(e['turn'], 0) + e.get('seconds', 0)
    assets = d['assets']
    img_dir = os.path.join(path, 'images')
    have = set(os.listdir(img_dir)) if os.path.isdir(img_dir) else set()
    thumbs, turns, drafts = {}, [], 0

    def add_thumb(h):
        f = os.path.basename(assets.get(h, {}).get('local_path') or '')
        if h not in thumbs and f in have:
            thumbs[h] = thumb(os.path.join(img_dir, f), f'{key}_{h}')
        return h in thumbs

    for t, m in enumerate([m for m in msgs if m['role'] == 'assistant' and m.get('tool_calls')], 1):
        calls = []
        for tc in m['tool_calls']:
            name, args = tc['function']['name'], json.loads(tc['function']['arguments'] or '{}')
            ret = returns.get(tc['id'], '')
            if name == 'search':
                try:
                    res = json.loads(ret)['results']
                except Exception:
                    res = []
                hosts = list(dict.fromkeys(host(r['url']) for r in res))[:3]
                calls.append({'k': 'search', 'a': args.get('query', ''), 'o': f"{len(res)} results · {', '.join(hosts)}"})
            elif name == 'open' and 'id' in args:
                h = args['id']
                a = assets.get(h, {})
                o = clip(a.get('caption') or a.get('alt') or 'image', 80)
                if a.get('width'):
                    o = f"{a['width']}×{a['height']} · {o}"
                c = {'k': 'image', 'a': h, 'o': o}
                if add_thumb(h):
                    c['img'] = h
                calls.append(c)
            elif name == 'open':
                u = args.get('url', '')
                first = ret.split('\n', 1)[0] if isinstance(ret, str) else ''
                title = re.sub(r'\s*\(https?://.*\)\s*$', '', first)
                mt = re.search(r'viewing lines \[(\d+) - (\d+)\] of (\d+)', ret if isinstance(ret, str) else '')
                offered = sum(1 for v in assets.values() if v.get('page_url') == u)
                bits = [clip(title, 56)] if title and not title.startswith(('Error', '{')) else []
                if mt:
                    bits.append(f"lines {mt.group(1)}–{mt.group(2)} / {mt.group(3)}")   # "of 8…" would trip build.py's banned-phrase check
                if offered and 'loc' not in args:
                    bits.append(f"{offered} image{'s' if offered > 1 else ''} offered")
                c = {'k': 'page', 'a': short_url(u) + (f", loc={args['loc']}" if 'loc' in args else ''), 'o': ' · '.join(bits) or clip(ret if isinstance(ret, str) else '', 60)}
                if isinstance(ret, str) and ret.startswith('{'):
                    try:
                        err = json.loads(ret)
                    except ValueError:
                        err = {}
                    if err.get('status') == 'TOOL_ERROR':
                        c.update(o='tool error · ' + clip(err.get('error_type', '') + (': ' + str(err['message']) if err.get('message') else ''), 70), err=True)
                calls.append(c)
            elif name == 'find':
                n = len(re.findall(r'^\s*\[\d+\]', ret, re.M)) if isinstance(ret, str) else 0
                calls.append({'k': 'find', 'a': f"{args.get('pattern', '')} · {short_url(args.get('url', ''), 40)}", 'o': f"{n} matches"})
            elif name == 'PythonInterpreter':
                calls.append({'k': 'python', 'a': clip(args.get('code', ''), 60), 'o': clip(ret if isinstance(ret, str) else '', 60)})
            elif name == 'submit_report':
                drafts += 1
                g = json.loads(ret)
                issues = {}
                for i in g.get('issues', []):
                    det = i.get('details') or {}
                    tgt = host(i['target']) if str(i.get('target', '')).startswith('http') else i.get('target', '')
                    issues.setdefault(i['code'], []).append({'t': tgt, 'x': f"HTTP {det['http_status']}" if det.get('http_status') else '', 'fix': i.get('fix', '')})
                calls.append({'k': 'submit', 'a': f'draft {drafts}', 'ok': g.get('status') == 'OK', 'checks': g.get('checks', {}),
                              'issues': [{'code': k, 'n': len(v), 'items': v[:3], 'fix': next((x['fix'] for x in v if x['fix']), '')} for k, v in issues.items()],
                              'left': g.get('repairs_left'), 'sha': (g.get('sha256') or '')[:12]})
        turns.append({'think': round(think.get(t, 0), 1), 'secs': round(think.get(t, 0) + tool_secs.get(t, 0), 1), 'calls': calls})
    last = d['submissions'][-1]
    contract, draft = last.get('contract', {}), last.get('raw_model_report') or ''
    cited = [h for h in dict.fromkeys(re.findall(r'\]\(((?:page|py)_img_\d+)\)', draft)) if add_thumb(h)]   # the delivered report's figures
    return {'mode': d['mode'], 'cmd': cmd.strip(), 'q': question.strip(),
            'contract': {k: contract.get(k) for k in ('min_chars', 'max_chars', 'min_images', 'min_sources')},
            'repairs': d['limits'].get('max_repairs'),
            'secs': round(sum(t['secs'] for t in turns)), 'calls': sum(len(t['calls']) for t in turns),
            'final': last.get('checks', {}), 'title': next((ln[2:].strip() for ln in draft.split('\n') if ln.startswith('# ')), ''),
            'cited': cited, 'turns': turns, 'thumbs': thumbs}


if __name__ == '__main__':
    out = {}
    for arg in sys.argv[1:]:
        key, _, p = arg.partition('=')
        r = out[key] = run(key, p)
        print(key, r['mode'], r['cmd'], len(r['turns']), 'turns', r['calls'], 'calls', r['secs'], 's', len(r['thumbs']), 'thumbs', file=sys.stderr)
    json.dump(out, open(os.path.join(ROOT, 'data', 'terminal.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
