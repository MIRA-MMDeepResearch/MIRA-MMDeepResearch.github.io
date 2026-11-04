"""Turn a pair of MIRA-Harness trajectories (Concise + Detail run of one request) into the
compact trace the page draws: tool calls per assistant turn, report-gate verdicts, run stats.

usage: traj2json.py CONCISE.json DETAIL.json OUT.json   (or import convert())
"""
import json, sys


def kind(call):
    name = call['function']['name']
    if name == 'search':
        return 'search'
    if name == 'open':
        try:
            a = json.loads(call['function']['arguments'])
        except Exception:
            a = {}
        return 'image' if 'id' in a else 'page'
    if name == 'find':
        return 'find'
    if name.lower().startswith('python'):
        return 'python'
    if name == 'submit_report':
        return 'submit'
    return 'page'


def arg(call):
    try:
        a = json.loads(call['function']['arguments'])
    except Exception:
        return ''
    for k in ('query', 'url', 'id', 'q'):
        if k in a:
            return str(a[k])[:80]
    return ''


def plural(n, one, many=None):
    return '%d %s' % (n, one if n == 1 else (many or one + 's'))


def reason(issues):
    """Human-readable gate verdict. Counts are of missing/failed items, never 'N of M'."""
    codes = [i['code'] for i in issues]
    parts = []
    src = next((i for i in issues if i['code'] == 'source_count'), None)
    if src:
        parts.append(plural(src['required'] - src['actual'], 'required source') + ' missing')
    n = codes.count('reference_unreachable')
    if n:
        parts.append(plural(n, 'reference') + ' unreachable')
    acc = next((i for i in issues if i['code'] == 'accessible_reference_count'), None)
    if acc and not n and not src:
        parts.append(plural(acc['required'] - acc['actual'], 'reachable source') + ' short')
    n = codes.count('unexamined_image')
    if n:
        parts.append(plural(n, 'cited image') + ' never opened')
    n = codes.count('nonlocal_or_missing_destination')
    if n:
        parts.append(plural(n, 'image path') + ' not from the run')
    seen = set()
    for c in codes:
        if c in ('source_count', 'reference_unreachable', 'accessible_reference_count', 'unexamined_image', 'nonlocal_or_missing_destination') or c in seen:
            continue
        seen.add(c)
        parts.append(c.replace('_', ' '))
    return '; '.join(parts)


def convert(concise_path, detail_path):
    trace, runs, question = {}, {}, None
    for label, path in (('concise', concise_path), ('detail', detail_path)):
        t = json.load(open(path))
        question = question or t['question'].strip()
        turns = []
        for m in t['messages']:
            if m['role'] == 'assistant':
                turns.append([{'k': kind(c), 'a': arg(c)} for c in (m.get('tool_calls') or [])])
        subs = {s['turn']: {'accepted': s['accepted'], 'reason': reason(s.get('issues') or [])} for s in t['submissions']}
        trace[label] = {'turns': turns, 'submissions': subs}
        runs[label] = {'calls': sum(len(x) for x in turns), 'turns': len(turns), 'secs': int(round(t['seconds']))}
    return trace, runs, question


if __name__ == '__main__':
    trace, runs, question = convert(sys.argv[1], sys.argv[2])
    json.dump(trace, open(sys.argv[3], 'w'), ensure_ascii=False)
    print(runs, file=sys.stderr)
