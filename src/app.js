(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DATA = {{DATA}};

/* ---------- look switcher (demo) ---------- */
const body = document.body;
let look = 'editorial';
try { look = localStorage.getItem('mira-look') || look; } catch (e) {}
function setLook(l) {
  body.dataset.look = l;
  $$('.looks button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === l)));
  try { localStorage.setItem('mira-look', l); } catch (e) {}
}
setLook(look);
$$('.looks button').forEach(b => b.addEventListener('click', () => setLook(b.dataset.look)));

/* ---------- watermark mascot ---------- */
const wm = $('#wm'), hero = $('.hero'), wmHint = $('#wmHint');
let clicks = 0;
/* the title block lies over most of the mascot, so hover and clicks are judged by position rather than by the event target */
function overWm(e, dogOnly) {
  const r = wm.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  return dogOnly ? x > .07 && x < .75 && y > .28 && y < .9 : x > 0 && x < 1 && y > 0 && y < 1;
}
if (!reduce && matchMedia('(hover:hover)').matches) {
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    wm.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));   // each layer scales this by its own depth
    wm.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    wm.classList.toggle('near', overWm(e));
  });
  hero.addEventListener('pointerleave', () => { wm.style.setProperty('--px', '0'); wm.style.setProperty('--py', '0'); wm.classList.remove('near'); });
}
const barks = ['Woof.', 'Sniffing the web…', 'Found an image.', 'Checking the contract…'];
function trick() {
  clicks++;
  wm.classList.remove('wag', 'flip'); void wm.offsetWidth;
  wm.classList.add(clicks % 5 === 0 ? 'flip' : 'wag');
  wmHint.textContent = clicks % 5 === 0 ? 'Good dog.' : barks[clicks % 4];
}
wm.addEventListener('click', trick);
hero.addEventListener('click', e => { if (!e.target.closest('a, button') && !String(getSelection()) && overWm(e, true)) trick(); });
wm.addEventListener('animationend', e => { if (e.animationName === 'wag' || e.animationName === 'flip' || e.animationName === 'shine') wm.classList.remove('wag', 'flip'); });
/* the cards slide in from the right on the first paint; from then on the dog and the cards drift and breathe on their own */
if (!reduce) { wm.classList.add('enter'); setTimeout(() => wm.classList.add('idle'), 1600); }

/* ---------- mascot attract: a few wags when the hero is first seen, one more when the reader comes back ---------- */
let heroSeen = false, autoWags = 0;
function wagOnce(cls) { wm.classList.remove('wag', 'flip'); void wm.offsetWidth; wm.classList.add(cls || 'wag'); }
function attract() {
  [0, 1600, 3200].forEach((t, k) => setTimeout(() => { if (document.hidden) return; wagOnce(); if (k === 2) wmHint.classList.add('pulse'); }, t));
}

/* ---------- top bar, side rail, section tracking ---------- */
const topbar = $('#topbar'), secnav = $('#secnav'), railTrack = $('#railTrack'), railFill = $('#railFill');
const navLinks = $$('#topbar nav a'), railLinks = $$('#secnav ol a');
const secs = railLinks.map(a => $(a.getAttribute('href')));
new IntersectionObserver(([en]) => {
  const out = !en.isIntersecting;
  topbar.classList.toggle('show', out); secnav.classList.toggle('show', out);
  if (out || reduce) return;
  if (!heroSeen) { heroSeen = true; setTimeout(attract, 700); }
  else if (autoWags < 2) { autoWags++; setTimeout(() => wagOnce(), 350); }
}, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
function updateSections() {
  const probe = scrollY + innerHeight * .38;
  let i = 0; secs.forEach((s, k) => { if (s && probe >= s.offsetTop) i = k; });
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;   // the last section may be too short for the probe to reach it
  if (atEnd) i = secs.length - 1;
  const top = secs[i].offsetTop, nextTop = secs[i + 1] ? secs[i + 1].offsetTop : top + secs[i].offsetHeight;
  const frac = atEnd ? 1 : Math.max(0, Math.min(1, (probe - top) / Math.max(1, nextTop - top)));
  const id = '#' + secs[i].id;
  navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === id));
  railLinks.forEach((a, k) => { a.classList.toggle('on', k === i); a.classList.toggle('done', k < i); });
  if (getComputedStyle(secnav).display === 'none') return;
  const nr = secnav.getBoundingClientRect();
  const cy = k => { const r = $('i', railLinks[k]).getBoundingClientRect(); return r.top + r.height / 2 - nr.top; };
  const c0 = cy(0), cN = cy(railLinks.length - 1), cur = cy(i), nxt = railLinks[i + 1] ? cy(i + 1) : cur;
  const dot = $('i', railLinks[0]).getBoundingClientRect();
  railTrack.style.left = railFill.style.left = (dot.left + dot.width / 2 - nr.left - 1) + 'px';
  railTrack.style.top = railFill.style.top = c0 + 'px';
  railTrack.style.height = (cN - c0) + 'px';
  railFill.style.height = Math.max(0, cur + frac * (nxt - cur) - c0) + 'px';
}
let navTick = false;
addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(() => { navTick = false; updateSections(); }); } }, { passive: true });
addEventListener('resize', updateSections);
updateSections(); setTimeout(updateSections, 900);

/* ---------- overview: highlight cards light up the matching sentence ---------- */
$$('.hl-list li').forEach(li => {
  li.addEventListener('mouseenter', () => $$('.lead .sent').forEach(s => s.classList.toggle('lit', s.dataset.k === li.dataset.k)));
  li.addEventListener('mouseleave', () => $$('.lead .sent.lit').forEach(s => s.classList.remove('lit')));
});

/* ---------- results chart ---------- */
const chartWrap = $('#chartWrap'), chartSvg = $('#chart'), chartTip = $('#chartTip');
const hidden = new Set();
function drawChart() {
  const C = DATA.chart, W = 1320, H = 380, L = 46, R = 14, T = 26, B = 50;
  const iw = W - L - R, ih = H - T - B, n = C.benchmarks.length, m = C.series.length;
  const gw = iw / n, pad = gw * .09, bw = (gw - 2 * pad) / m;
  const y = v => T + ih - (v / 100) * ih;
  let s = '';
  for (let g = 0; g <= 100; g += 25) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke-width="1"/>`;
    s += `<text x="${L - 8}" y="${y(g) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--font-mono)">${g}</text>`;
  }
  C.benchmarks.forEach((bn, g) => {
    const x0 = L + g * gw;
    C.series.forEach((se, i) => {
      const v = se.values[g], x = x0 + pad + i * bw;
      if (v == null) {
        s += `<text x="${x + bw / 2}" y="${y(0) - 4}" text-anchor="middle" font-size="11" fill="var(--muted)">–</text>`;
        return;
      }
      const hid = hidden.has(i), h = hid ? 0 : ih - (y(v) - T);
      s += `<rect class="bar${se.ours ? ' ours' : ''}" data-g="${g}" data-i="${i}" data-v="${v}" x="${x + 1}" y="${hid ? y(0) : y(v)}" width="${Math.max(bw - 2, 2)}" height="${h}" rx="2" style="fill:${se.color};--d:${g * 70 + i * 40}ms"/>`;
      if (se.ours && !hid) s += `<text class="val" x="${x + bw / 2}" y="${y(v) - 6}" text-anchor="middle" style="--d:${g * 70 + 420}ms">${v.toFixed(1)}</text>`;
    });
    s += `<text class="bench" data-g="${g}" x="${x0 + gw / 2}" y="${H - 22}" text-anchor="middle">${bn}</text>`;
  });
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke-width="1"/>`;
  chartSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  chartSvg.innerHTML = s;
}
function drawLegend() {
  $('#legend').innerHTML = DATA.chart.series.map((se, i) =>
    `<button type="button" data-i="${i}" aria-pressed="${!hidden.has(i)}" style="--c:${se.color}"><i></i>${se.label}</button>`).join('');
}
drawChart(); drawLegend();
/* grow the bars from the baseline when the chart scrolls into view; re-arm once it has left the viewport */
let growT = null;
function growChart() {
  chartWrap.classList.add('pre'); void chartWrap.offsetWidth;
  chartWrap.classList.add('staggering'); chartWrap.classList.remove('pre');
  clearTimeout(growT); growT = setTimeout(() => chartWrap.classList.remove('staggering'), 1800);
}
if (!reduce) {
  chartWrap.classList.add('pre');
  let armed = true;
  new IntersectionObserver(ens => ens.forEach(en => {
    if (en.intersectionRatio >= .3 && armed) { armed = false; growChart(); }
    else if (!en.isIntersecting && !armed) { armed = true; chartWrap.classList.add('pre'); }
  }), { threshold: [0, .3] }).observe(chartWrap);
}
/* chart <-> table: a bar lights up the number it comes from, and a table number lights up its bar */
function cellFor(bar) {
  const key = DATA.chart.series[+bar.dataset.i].key, col = +bar.dataset.g + 2;
  const tr = $$('tr[data-name]', host).find(r => r.dataset.name === key);
  return tr ? $(`td[data-col="${col}"]`, tr) : null;
}
function litCell(td) { $$('td.v.lit', host).forEach(x => x.classList.remove('lit')); if (td) td.classList.add('lit'); }
$('#legend').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const i = +b.dataset.i; hidden.has(i) ? hidden.delete(i) : hidden.add(i);
  drawChart(); drawLegend();
});
function placeTip(tip, wrap, target, html) {
  const r = target.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  tip.innerHTML = html;
  tip.style.left = (r.left + r.width / 2 - w.left) + 'px';
  tip.style.top = (r.top - w.top - tip.offsetHeight - 2) + 'px';
  tip.classList.add('on');
}
chartSvg.addEventListener('mouseover', e => {
  const bar = e.target.closest('.bar'); if (!bar) return;
  const se = DATA.chart.series[+bar.dataset.i], bn = DATA.chart.benchmarks[+bar.dataset.g];
  $$('.bar.hot', chartSvg).forEach(b => b.classList.remove('hot'));
  bar.classList.add('hot'); chartWrap.classList.add('hovering'); litCell(cellFor(bar));
  placeTip(chartTip, chartWrap, bar, `<b>${se.label}</b><br><span class="m">${(+bar.dataset.v).toFixed(2)}</span> on ${bn} · click to see it in the table`);
});
chartSvg.addEventListener('mouseout', e => {
  if (e.target.closest('.bar')) { chartWrap.classList.remove('hovering'); chartTip.classList.remove('on'); $$('.bar.hot', chartSvg).forEach(b => b.classList.remove('hot')); litCell(null); }
});
chartSvg.addEventListener('click', e => {
  const bar = e.target.closest('.bar');
  if (bar) {
    const td = cellFor(bar); if (!td) return;
    td.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash'); }, 350);
    return;
  }
  const t = e.target.closest('.bench'); if (!t) return;
  const col = +t.dataset.g + 2;
  $('#tableHost').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => $$(`td[data-col="${col}"]`).forEach(td => { td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash'); }), 350);
});

/* ---------- results table ---------- */
const host = $('#tableHost');
const T = DATA.table, header = T[0].cells, nb = header.length - 2;
const groups = [];   // [{title, rows:[{cls, cells, vals, idx}]}]
T.slice(1).forEach(r => {
  if (r.cls === 'group') { groups.push({ title: r.cells[0], rows: [] }); return; }
  if (r.cls === 'delta') return;
  const vals = r.cells.slice(2).map(c => (c === '–' || c === '' ? null : +c));
  groups[groups.length - 1].rows.push({ cls: r.cls, name: r.cells[0], params: r.cells[1], vals });
});
const colMax = Array.from({ length: nb }, (_, c) => Math.max(...groups.flatMap(g => g.rows.map(r => r.vals[c] ?? 0))));
const bestOpen = Array.from({ length: nb }, (_, c) => Math.max(...groups.slice(1).flatMap(g => g.rows.map(r => r.vals[c] ?? -1))));
let pinned = 'MIRA-Base', sortCol = null, sortDir = -1;
function fmt(v) { return v == null ? '–' : v.toFixed(2); }
const narrowTable = matchMedia('(max-width: 960px)');
function renderTable() {
  const ref = groups.flatMap(g => g.rows).find(r => r.name === pinned);
  let h = `<table class="results"><colgroup><col class="c-model"><col class="c-params">${'<col>'.repeat(nb)}</colgroup><thead><tr>`;
  h += `<th data-col="0">Model</th><th class="params" data-col="1">Params</th>`;
  header.slice(2).forEach((b, c) => h += `<th data-col="${c + 2}">${b}<span class="sort">${sortCol === c ? (sortDir < 0 ? '▾' : '▴') : ''}</span></th>`);
  h += `</tr></thead><tbody>`;
  groups.forEach((g, gi) => {
    h += `<tr class="group"><td colspan="${nb + (narrowTable.matches ? 1 : 2)}">${g.title}</td></tr>`;   // the Params column is hidden below 960px
    let rows = g.rows.slice();
    if (sortCol != null) rows.sort((a, b) => ((b.vals[sortCol] ?? -1) - (a.vals[sortCol] ?? -1)) * -sortDir);
    rows.forEach(r => {
      const isRef = ref && r.name === ref.name;
      h += `<tr class="${r.cls}${isRef ? ' pinned' : ''}" data-name="${r.name}"><td class="model">${r.name}</td><td class="params">${r.params}</td>`;
      r.vals.forEach((v, c) => {
        const best = gi > 0 && v != null && v === bestOpen[c];
        let d = '';
        if (ref && !isRef && v != null && ref.vals[c] != null) { const dv = v - ref.vals[c]; d = `<span class="d ${dv >= 0 ? 'up' : 'dn'}">${dv >= 0 ? '+' : '−'}${Math.abs(dv).toFixed(2)}</span>`; }
        h += `<td class="v${best ? ' best' : ''}" data-col="${c + 2}" data-h="${header[c + 2]}">${fmt(v)}${d}${v != null ? `<span class="bar" style="--w:${(v / colMax[c]).toFixed(3)}"></span>` : ''}</td>`;
      });
      h += `</tr>`;
    });
  });
  h += `</tbody></table>`;
  host.innerHTML = h;
  $('#pinName').textContent = pinned;
}
renderTable();
narrowTable.addEventListener('change', renderTable);
host.addEventListener('click', e => {
  const th = e.target.closest('thead th');
  if (th) {
    const c = +th.dataset.col - 2;
    if (c < 0) { sortCol = null; } else if (sortCol === c) { sortDir = -sortDir; } else { sortCol = c; sortDir = -1; }
    renderTable(); return;
  }
  const td = e.target.closest('td.model');
  if (td) { pinned = td.closest('tr').dataset.name; renderTable(); }
});
$('#resetSort').addEventListener('click', () => { sortCol = null; pinned = 'MIRA-Base'; renderTable(); });
host.addEventListener('mouseover', e => {
  const td = e.target.closest('td.v'); if (!td) return;
  const col = td.dataset.col;
  $$('td.hl-col, th.hl-col, tr.hl-row', host).forEach(x => x.classList.remove('hl-col', 'hl-row'));
  $$(`td[data-col="${col}"], th[data-col="${col}"]`, host).forEach(x => x.classList.add('hl-col'));
  td.closest('tr').classList.add('hl-row');
  const si = DATA.chart.series.findIndex(se => se.key === td.closest('tr').dataset.name);
  $$('.bar.hot', chartSvg).forEach(b => b.classList.remove('hot')); chartWrap.classList.remove('hovering');
  if (si >= 0) { const bar = $(`.bar[data-i="${si}"][data-g="${col - 2}"]`, chartSvg); if (bar) { bar.classList.add('hot'); chartWrap.classList.add('hovering'); } }
});
host.addEventListener('mouseleave', () => { $$('td.hl-col, th.hl-col, tr.hl-row', host).forEach(x => x.classList.remove('hl-col', 'hl-row')); $$('.bar.hot', chartSvg).forEach(b => b.classList.remove('hot')); chartWrap.classList.remove('hovering'); });

/* ---------- step figures: a frosted grey-red veil over the whole figure; a crisp lens shows the current block ----------
   (clip-path does not clip backdrop-filter's blur in Chrome, so the hole is a second copy of the figure, clipped and laid over the veil) */
const STEP_MS = 1800;
/* scrolling under a resting pointer fires pointer events with unchanged coordinates; only a pointer that really moved counts as a hover */
let lastXY = '', movedAt = 0;
addEventListener('pointermove', e => { const xy = e.clientX + ',' + e.clientY; if (xy !== lastXY) { lastXY = xy; movedAt = performance.now(); } }, true);
const pointerMoved = () => performance.now() - movedAt < 80;
function initSteps(key, listId, stageId, capId) {
  const list = $(listId), stage = $(stageId), cap = $(capId), spot = $('.spot', stage), lens = $('.lens', stage), copy = $('img', lens), img = $('img', stage), steps = DATA.steps[key];
  const rest = cap.textContent;
  list.innerHTML = steps.map((st, i) => `<li><button type="button" data-i="${i}" aria-pressed="false"><span class="n">${st.n ?? i + 1}</span><span><b>${st.t}</b><span>${st.d}</span></span></button></li>`).join('');
  let locked = null, showing = null;
  function hole(i) {
    // the lens box snaps to whole pixels and the copy gets the exact remainder, so the copy's paint rect equals the original's
    const [x, y, w, h] = steps[i].box, ir = img.getBoundingClientRect(), pr = spot.getBoundingClientRect();
    const ox = ir.left - pr.left, oy = ir.top - pr.top;
    const L = Math.round(ox + x / 100 * ir.width), T = Math.round(oy + y / 100 * ir.height), R = Math.round(ox + (x + w) / 100 * ir.width), B = Math.round(oy + (y + h) / 100 * ir.height);
    Object.assign(lens.style, { left: L + 'px', top: T + 'px', width: (R - L) + 'px', height: (B - T) + 'px' });
    Object.assign(copy.style, { left: (ox - L) + 'px', top: (oy - T) + 'px', width: ir.width + 'px', height: ir.height + 'px' });
  }
  function show(i) {
    $$('button', list).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    if (i == null) { showing = null; stage.classList.remove('on'); cap.textContent = rest; return; }
    const wasOff = showing == null;
    showing = i; hole(i);
    if (wasOff) void lens.offsetWidth;   // the lens jumps into place while still invisible, then only the opacity fades in
    stage.classList.add('on'); cap.textContent = steps[i].long || steps[i].d;
  }
  /* whenever the figure scrolls into view, the lens walks through the steps by itself (a bar fills under the current one); a walk still
     running is left alone, a finished one plays again on the next visit unless the reader has pinned a step. A real hover, tap or key takes over */
  let auto = null, armed = true;
  list.style.setProperty('--tick', STEP_MS + 'ms');
  function stopAuto() { if (auto) { clearTimeout(auto); auto = null; } list.classList.remove('auto'); }
  function autoplay() {
    let i = 0;
    list.classList.add('auto');
    const tick = () => { if (i < steps.length) { show(i++); auto = setTimeout(tick, STEP_MS); } else { stopAuto(); show(locked); } };
    tick();
  }
  if (!reduce) new IntersectionObserver(ens => ens.forEach(en => {
    if (en.intersectionRatio >= .6 && armed) { armed = false; if (!auto && locked == null) autoplay(); }
    else if (!en.isIntersecting) armed = true;
  }), { threshold: [0, .6] }).observe(stage);
  list.addEventListener('pointermove', e => {
    const b = e.target.closest('button');
    if (!b || e.pointerType === 'touch' || !pointerMoved()) return;
    if (auto || showing !== +b.dataset.i) { stopAuto(); show(+b.dataset.i); }
  });
  list.addEventListener('mouseleave', () => { if (!auto) show(locked); });
  list.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stopAuto(); const i = +b.dataset.i; locked = locked === i ? null : i; show(locked); });
  list.addEventListener('focusin', e => { const b = e.target.closest('button'); if (b) { stopAuto(); show(+b.dataset.i); } });
  addEventListener('resize', () => { if (showing != null) hole(showing); });
  img.addEventListener('load', () => { if (showing != null) hole(showing); });
  const open = () => openLightbox(img.src, img.alt, steps.map((s, i) => `${s.n ?? i + 1}. ${s.t}`).join(' · '), '');
  stage.addEventListener('click', () => { stopAuto(); show(locked); open(); });
  $(`[data-zoom="${key}"]`).addEventListener('click', open);
}
initSteps('harness', '#harnessSteps', '#harnessStage', '#harnessCap');
initSteps('data', '#dataSteps', '#dataStage', '#dataCap');

/* ---------- case study: the first request's run is replayed once; the deck below holds every report ---------- */
const CASES = DATA.cases, MODES = ['concise', 'detail'], REPLAY = CASES[0];
let cur = 0, CUR = CASES[0], curMode = 'concise', turning = false;
const deck = $('#deck'), casePage = $('#casePage'), caseTabs = $('#caseTabs');
function runTiles(c) {
  return MODES.map(m => { const r = c.runs[m]; return `<div class="run"><span class="mode">${m}</span><span class="stat"><b>${r.calls}</b><small>calls</small></span><span class="stat"><b>${r.turns}</b><small>turns</small></span><span class="stat"><b>${r.secs}</b><small>s</small></span></div>`; }).join('');
}
$('#replayKicker').textContent = 'Tool-call replay · the first request, Concise and Detail runs';
$('#replayTitle').textContent = REPLAY.title;
$('#replayQ').textContent = '“' + REPLAY.question + '”';
$('#replayRuns').innerHTML = runTiles(REPLAY);
caseTabs.innerHTML = CASES.map((c, k) => `<button type="button" role="tab" data-k="${k}" aria-selected="${k === 0}"><span class="no">0${k + 1}</span>${c.tab}</button>`).join('');
caseTabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) switchCase(+b.dataset.k); });
function renderHead() {
  $('#caseKicker').textContent = CUR.kicker; $('#caseTitle').textContent = CUR.title;
  $('#caseQ').textContent = '“' + CUR.question + '”';
  $('#caseRuns').innerHTML = runTiles(CUR);
  $$('button', caseTabs).forEach(b => b.setAttribute('aria-selected', String(+b.dataset.k === cur)));
}

/* ---------- trace timeline (first request only) ---------- */
const KINDS = { search: ['Search', '#F3CDD0'], page: ['Open page', '#E59AA2'], image: ['Open image', '#C44C5B'], find: ['Find', '#A8303E'], python: ['Python', '#8B1F2C'], submit: ['Submit report', '#4F0C14'] };
const traceSvg = $('#trace'), traceScroll = $('#traceScroll'), traceTip = $('#traceTip');
let maxTurns = 1;
function drawTrace() {
  const TR = REPLAY.trace;
  maxTurns = Math.max(...MODES.map(m => TR[m].turns.length));
  const S = 13, G = 3, COLW = 2 * S + G, LEFT = 84, TOTW = 230;
  const PITCH = Math.max(31, Math.min(46, Math.floor((1180 - LEFT - 40 - TOTW) / maxTurns)));   // long runs pack their columns tighter
  const W = LEFT + maxTurns * PITCH + 40 + TOTW;
  let yCur = 18, html = '';
  const totalMax = Math.max(...MODES.map(m => TR[m].turns.reduce((a, t) => a + t.length, 0)));
  // both revision bands end at the same column, so the label fits and the rows line up
  const bandEnd = Math.max(...MODES.map(m => Math.max(...Object.keys(TR[m].submissions).map(Number))));
  MODES.forEach(mode => {
    const tr = TR[mode], turns = tr.turns, subs = tr.submissions;
    const rowsMax = Math.ceil(Math.max(...turns.map(t => t.length)) / 2);
    const top = yCur, base = top + 16 + rowsMax * (S + G);
    const subTurns = Object.keys(subs).map(Number).sort((a, b) => a - b);
    const firstRej = subTurns.find(t => !subs[t].accepted), last = subTurns[subTurns.length - 1];
    if (firstRej && last > firstRej) {
      const x0 = LEFT + firstRej * PITCH - 8, x1 = LEFT + (bandEnd - 1) * PITCH + COLW + 8;
      html += `<rect class="band" x="${x0}" y="${top - 2}" width="${x1 - x0}" height="${base - top + 4}" rx="6"/>`;
      html += `<text class="band-l" x="${x0 + 10}" y="${top + 10}">revision after the gate rejects a draft</text>`;
    }
    html += `<text class="mode-l" x="${LEFT - 14}" y="${base - rowsMax * (S + G) / 2 + 4}" text-anchor="end">${mode.toUpperCase()}</text>`;
    html += `<line class="axis" x1="${LEFT - 4}" x2="${LEFT + turns.length * PITCH - PITCH + COLW + 4}" y1="${base + 2}" y2="${base + 2}" stroke-width="1"/>`;
    turns.forEach((calls, ti) => {
      const turn = ti + 1, x0 = LEFT + ti * PITCH;
      html += `<rect class="col-hit" data-mode="${mode}" data-turn="${turn}" x="${x0 - 6}" y="${top}" width="${COLW + 12}" height="${base - top + 20}"/>`;
      calls.forEach((c, ci) => {
        const col = ci % 2, row = Math.floor(ci / 2);
        const x = x0 + col * (S + G), y = base - (row + 1) * (S + G) + G;
        const sub = c.k === 'submit' ? subs[turn] : null;
        html += `<g class="sq" data-mode="${mode}" data-turn="${turn}" data-i="${ci}" data-k="${c.k}">`;
        html += `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="2" fill="${KINDS[c.k][1]}"/>`;
        if (sub) html += sub.accepted
          ? `<path d="M${x + 3} ${y + 7} L${x + 5.6} ${y + 9.6} L${x + 10.2} ${y + 4}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M${x + 3.5} ${y + 3.5} L${x + 9.5} ${y + 9.5} M${x + 9.5} ${y + 3.5} L${x + 3.5} ${y + 9.5}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
        html += `</g>`;
      });
      html += `<text class="turn-l" data-mode="${mode}" data-turn="${turn}" x="${x0 + COLW / 2}" y="${base + 15}" text-anchor="middle">${turn}</text>`;
      if (subs[turn] && !subs[turn].accepted) {
        const parts = subs[turn].reason.split('; ');
        html += `<text class="gate-l" x="${x0 + COLW / 2}" y="${base + 30}" text-anchor="middle">${parts.map((p, i) => `<tspan x="${x0 + COLW / 2}" dy="${i ? 12 : 0}">${i === 0 ? 'gate: ' : ''}${p}</tspan>`).join('')}</text>`;
      }
    });
    // totals bar
    const counts = {}; turns.flat().forEach(c => counts[c.k] = (counts[c.k] || 0) + 1);
    const total = turns.flat().length, tx = LEFT + maxTurns * PITCH + 30, tw = TOTW * total / totalMax, ty = base - 22;
    html += `<text class="tot-l" x="${tx}" y="${ty - 8}">${total} calls, ${turns.length} turns</text>`;
    let cx = tx;
    Object.keys(KINDS).forEach(k => {
      if (!counts[k]) return;
      const w = tw * counts[k] / total;
      html += `<rect x="${cx}" y="${ty}" width="${w}" height="18" fill="${KINDS[k][1]}"/>`;
      if (w > 14) html += `<text class="tot-n" x="${cx + w / 2}" y="${ty + 13}" text-anchor="middle" fill="${['search', 'page'].includes(k) ? '#4F0C14' : '#fff'}">${counts[k]}</text>`;
      cx += w;
    });
    const reasonLines = Math.max(0, ...Object.values(subs).map(s => s.reason ? s.reason.split('; ').length : 0));
    yCur = base + 40 + reasonLines * 12 + 10;
  });
  html += `<text class="band-l" x="${LEFT + (maxTurns * PITCH) / 2}" y="${yCur - 2}" text-anchor="middle">assistant turn</text>`;
  traceSvg.setAttribute('viewBox', `0 0 ${W} ${yCur + 6}`);
  traceSvg.innerHTML = html;
  $('#traceLegend').innerHTML = Object.entries(KINDS).filter(([k]) => MODES.some(m => TR[m].turns.flat().some(c => c.k === k)))
    .map(([k, [label, color]]) => `<button type="button" data-k="${k}" aria-pressed="true" style="--c:${color}"><i></i>${label}</button>`).join('');
}
$('#traceLegend').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (!b) return; litSquares(sq => sq.dataset.k === b.dataset.k); });
$('#traceLegend').addEventListener('mouseleave', unlit);
function litSquares(pred) {
  traceScroll.classList.add('dim');
  $$('.sq', traceSvg).forEach(sq => sq.classList.toggle('lit', pred(sq)));
}
function unlit() { traceScroll.classList.remove('dim'); $$('.sq.lit, .turn-l.lit', traceSvg).forEach(x => x.classList.remove('lit')); }
traceSvg.addEventListener('mouseover', e => {
  const sq = e.target.closest('.sq');
  if (sq) {
    const c = REPLAY.trace[sq.dataset.mode].turns[sq.dataset.turn - 1][+sq.dataset.i];
    const arg = c.a ? `<br><span class="m">${c.a.replace(/</g, '&lt;')}${c.a.length >= 80 ? '…' : ''}</span>` : '';
    const sub = c.k === 'submit' ? REPLAY.trace[sq.dataset.mode].submissions[sq.dataset.turn] : null;
    const gate = sub ? `<br>${sub.accepted ? 'accepted by the report gate' : 'rejected: ' + sub.reason}` : '';
    placeTip(traceTip, traceScroll, $('rect', sq), `<b>${KINDS[c.k][0]}</b> · ${sq.dataset.mode} turn ${sq.dataset.turn}${arg}${gate}`);
    return;
  }
  const col = e.target.closest('.col-hit');
  if (col) $$('.turn-l', traceSvg).forEach(t => t.classList.toggle('lit', t.dataset.mode === col.dataset.mode && t.dataset.turn === col.dataset.turn));
});
traceSvg.addEventListener('mouseout', e => { if (e.target.closest('.sq')) traceTip.classList.remove('on'); if (e.target.closest('.col-hit')) $$('.turn-l.lit', traceSvg).forEach(t => t.classList.remove('lit')); });

/* playback */
const scrub = $('#scrub'), counter = $('#counter'), playBtn = $('#playBtn');
let timer = null;
function showTurns(t) {
  let shown = 0;
  $$('.sq', traceSvg).forEach(sq => {
    const vis = +sq.dataset.turn <= t;
    sq.style.transitionDelay = vis && +sq.dataset.turn === t ? (sq.dataset.i * 40) + 'ms' : '0ms';
    sq.classList.toggle('hidden-call', !vis); if (vis) shown++;
  });
  $$('.turn-l', traceSvg).forEach(l => l.style.opacity = +l.dataset.turn <= t ? 1 : .25);
  counter.textContent = t === 0 ? 'turn 0 · 0 calls' : `turn ${t} / ${maxTurns} · ${shown} calls`;
}
scrub.addEventListener('input', () => { stop(); showTurns(+scrub.value); });
function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn.innerHTML = '&#9654; Replay the run'; }
function play() {
  stop();
  let t = 0; scrub.value = 0; showTurns(0); playBtn.innerHTML = '&#10074;&#10074; Pause';
  const step = reduce ? 150 : (maxTurns > 16 ? 420 : 700);
  timer = setInterval(() => { t++; scrub.value = t; showTurns(t); if (t >= maxTurns) stop(); }, step);
}
playBtn.addEventListener('click', () => { if (timer) stop(); else play(); });
drawTrace(); scrub.max = maxTurns; scrub.value = maxTurns; showTurns(maxTurns);
/* the replay starts by itself every time it scrolls into view, so nobody has to find the button; a run still playing is left alone */
if (!reduce) {
  let armed = true;
  new IntersectionObserver(ens => ens.forEach(en => {
    if (en.intersectionRatio >= .45 && armed) { armed = false; setTimeout(() => { if (!timer) play(); }, 250); }
    else if (!en.isIntersecting) armed = true;
  }), { threshold: [0, .45] }).observe($('#replay'));
}

/* ---------- the book: the report flows through fixed-height columns; a view shows one or two of them, and turning a page slides the next ones in ---------- */
const article = $('#article'), articleBody = $('#articleBody'), modeSwitch = $('#modeSwitch');
const book = $('#book'), view = $('#bookView'), pageNo = $('#pageNo'), pageDots = $('#pageDots'), prevBtn = $('#prevPage'), nextBtn = $('#nextPage');
const secMenu = $('#secMenu'), gateMenu = $('#gateMenu'), toc = $('#toc');
let pg = 0, pages = 1, ncol = 2, colw = 0, GAP = 48;
function offX(el) { let x = 0; for (let e = el; e && e !== article; e = e.offsetParent) x += e.offsetLeft; return x; }   // layout position inside the article: exact in multicol, unaffected by the deck's transition transforms
function measure() {
  const w = parseFloat(getComputedStyle(view).width);   // fractional: the integer clientWidth would drift the pages by up to half a pixel each
  GAP = parseFloat(getComputedStyle(book).getPropertyValue('--book-gap')) || 48;
  ncol = w >= 860 ? 2 : 1;
  article.style.columnCount = ncol;
  colw = (w - (ncol - 1) * GAP) / ncol;
  article.style.setProperty('--pg-w', (w + GAP) + 'px');
  let right = 0;
  $$('#articleBody *').forEach(el => { if (el.offsetWidth || el.offsetHeight) right = Math.max(right, offX(el) + el.offsetWidth); });
  const cols = Math.max(1, Math.floor((right - 1) / (colw + GAP)) + 1);
  pages = Math.max(1, Math.ceil(cols / ncol));
}
function pageOf(el) { return Math.max(0, Math.min(pages - 1, Math.floor(Math.floor((offX(el) + 2) / (colw + GAP)) / ncol))); }
function paint() {
  article.style.setProperty('--pg', pg);
  pageNo.textContent = `Page ${pg + 1} of ${pages}`;
  prevBtn.disabled = pg === 0; nextBtn.disabled = pg >= pages - 1;
  pageDots.innerHTML = pages <= 18 ? Array.from({ length: pages }, (_, i) => `<button type="button" data-p="${i}"${i === pg ? ' class="on"' : ''} aria-label="Page ${i + 1}"></button>`).join('') : '';
  let on = null; $$('a', toc).forEach(a => { if (+a.dataset.p <= pg) on = a; a.classList.remove('on'); }); if (on) on.classList.add('on');
}
function go(n) { pg = Math.max(0, Math.min(pages - 1, n)); paint(); }
function reflow(keep) {
  article.classList.add('jump');   // re-measuring must not animate
  measure();
  $$('a', toc).forEach(a => { const sec = $('#' + a.dataset.sec); a.dataset.p = sec ? pageOf(sec) : 0; $('small', a).textContent = 'p. ' + (+a.dataset.p + 1); });
  pg = keep ? pageOf(keep) : Math.min(pg, pages - 1);
  paint();
  void article.offsetWidth;
  article.classList.remove('jump');
}
let reflowTimer = null;
function scheduleReflow() { clearTimeout(reflowTimer); reflowTimer = setTimeout(() => reflow(), 60); }
prevBtn.addEventListener('click', () => go(pg - 1));
nextBtn.addEventListener('click', () => go(pg + 1));
pageDots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(+b.dataset.p); });
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (/^(input|textarea|select)$/i.test(document.activeElement.tagName)) return;
  if (!book.matches(':hover') && !book.contains(document.activeElement)) return;
  e.preventDefault(); endTour(); go(pg + (e.key === 'ArrowRight' ? 1 : -1));
});
let swipe = null;
view.addEventListener('pointerdown', e => { swipe = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; });
view.addEventListener('pointerup', e => { if (!swipe) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(pg + (dx < 0 ? 1 : -1)); });
let wheelAcc = 0, wheelLock = false;
view.addEventListener('wheel', e => {   // a horizontal trackpad swipe turns the page; vertical scrolling passes through
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 6) return;
  e.preventDefault();
  if (wheelLock) return;
  wheelAcc += e.deltaX;
  if (Math.abs(wheelAcc) > 60) { go(pg + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = true; setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 700); }
}, { passive: false });
view.addEventListener('scroll', () => { view.scrollLeft = 0; view.scrollTop = 0; });   // focus or anchors must never shift the hidden overflow
view.addEventListener('focusin', e => { if (e.target !== view) { const p = pageOf(e.target); if (p !== pg) go(p); } });   // keyboard focus turns to the page that holds the focused element
addEventListener('resize', () => { clearTimeout(reflowTimer); reflowTimer = setTimeout(() => reflow(), 120); });
if (document.fonts) document.fonts.ready.then(scheduleReflow);
document.addEventListener('click', e => { [secMenu, gateMenu].forEach(m => { if (m.open && !m.contains(e.target)) m.open = false; }); });

/* ---------- report reader ---------- */
['clue', 'fact', 'note', 'trace'].forEach(k => { const cb = $('#layer-' + k); cb.addEventListener('change', () => { article.classList.toggle('show-' + k, cb.checked); cb.closest('label').classList.toggle('on', cb.checked); reflow(); }); });
function renderReport() {
  const rep = CUR.report[curMode];
  articleBody.innerHTML = rep.html;
  modeSwitch.innerHTML = MODES.map(m => { const r = CUR.report[m]; return `<button type="button" role="tab" data-mode="${m}" aria-selected="${m === curMode}"><b>${m === 'concise' ? 'Concise' : 'Detail'} report</b><small>${r.images} image${r.images === 1 ? '' : 's'} · ${r.refs} source${r.refs === 1 ? '' : 's'}</small></button>`; }).join('');
  $$('.chips .cnt').forEach(c => c.textContent = $$(c.dataset.cnt, article).length);
  // the gate log moves out of the report into its menu
  const gateSec = $('.rd-gate', article), gateItems = gateSec ? $$('li', gateSec).length : 0;
  $('#gateLog').innerHTML = gateSec ? $('ul', gateSec).innerHTML : '<li>No gate record for this run.</li>';
  $('#gateSum').textContent = gateItems ? `Report gate · ${gateItems} draft${gateItems === 1 ? '' : 's'}` : 'Report gate';
  if (gateSec) gateSec.remove();
  // table of contents
  $$('.rd-sec', article).forEach((sec, i) => { sec.id = 'rd-sec-' + i; });
  toc.innerHTML = $$('.rd-sec', article).map(sec => { const h = $('h4', sec); return h ? `<li><a href="#${sec.id}" data-sec="${sec.id}" data-p="0">${h.textContent}<small></small></a></li>` : ''; }).join('');
  secMenu.open = false; gateMenu.open = false;
  $$('img', articleBody).forEach(im => { if (!im.complete) im.addEventListener('load', scheduleReflow, { once: true }); });
  pg = 0; reflow();
}
modeSwitch.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.dataset.mode === curMode) return; curMode = b.dataset.mode; renderReport(); });
toc.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); go(+a.dataset.p); secMenu.open = false; view.focus({ preventScroll: true }); });
// citations <-> references
article.addEventListener('mouseover', e => {
  const c = e.target.closest('.cite'); if (c) { $$(`.rd-reflist li[data-ref="${c.dataset.ref}"]`, article).forEach(li => li.classList.add('lit')); return; }
  const li = e.target.closest('.rd-reflist li'); if (li) { $$(`.cite[data-ref="${li.dataset.ref}"]`, article).forEach(x => x.classList.add('lit')); return; }
  const ir = e.target.closest('.imgref'); if (ir) { const f = $(`#img-${ir.dataset.img}`); if (f) f.classList.add('lit'); }
});
article.addEventListener('mouseout', e => { if (e.target.closest('.cite, .rd-reflist li, .imgref')) $$('.lit', article).forEach(x => x.classList.remove('lit')); });
function flashTo(t, lit) {
  go(pageOf(t));
  t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
  if (lit) { t.classList.add('lit'); setTimeout(() => t.classList.remove('lit'), 1600); }
}
article.addEventListener('click', e => {
  const a = e.target.closest('a.cite, a.imgref');
  if (a) { e.preventDefault(); const t = $(a.getAttribute('href')); if (t) flashTo(t, a.classList.contains('imgref')); return; }
  const refn = e.target.closest('.rd-reflist li .rd-refn');
  if (refn) { const first = $$(`.cite[data-ref="${refn.closest('li').dataset.ref}"]`, article).find(c => c.getBoundingClientRect().width); if (first) flashTo(first, true); return; }   // the first citation that is rendered (notes may be hidden)
  const tr = e.target.closest('.rd-trace'); if (tr) { tr.classList.toggle('open'); reflow(tr.closest('figure') || tr); return; }
  const iw = e.target.closest('.rd-imgwrap');
  if (iw) { const img = $('img', iw), fig = iw.closest('figure'); openLightbox(img.src, img.alt, $('figcaption', fig).textContent, $$('.rd-box', iw).map(b => b.outerHTML).join('')); }
});

/* ---------- coach marks: whenever the toolbar comes fully into view after the deck has been off screen, a halo walks over each control with a
   one-line tip. Back / Next step by hand (which stops the auto-advance), × or a click elsewhere closes it, the Guide button replays it ---------- */
const coach = $('#coach'), halo = $('.halo', coach), say = $('.say', coach), tipsBtn = $('#tipsBtn'), toolbar = $('.toolbar', casePage);
const tipBack = $('.back', say), tipNext = $('.next', say), TIP_MS = 3200;
const TOUR = [
  ['#modeSwitch', 14, 'Two reports per request', 'Switch between the Concise and the Detail report of the same run.'],
  ['.toolbar .chips', 14, 'The paper’s annotation layers', 'Toggle request terms, checked facts and image boxes, paper notes and trace lines in the text.'],
  ['#secMenu', 999, 'Jump to a section', 'Every section of the report, with its page.'],
  ['#gateMenu', 999, 'What the report gate said', 'Its verdict on each draft, straight from the run.'],
  ['#nextPage', 999, 'Turn the page', 'The arrows, the ← → keys or a swipe; the dots below show where you are.'],
  ['#tipsBtn', 999, 'This guide', 'It comes back when you return to the reports, and this button opens it any time.'],
];
let tourT = null, tourAt = -1, tourShown = -1, tourPlan = [], guideArmed = true;   // tourAt: the tip on its way in; tourShown: the tip on screen
function inView(el) { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; }
function placeCoach(sel, rad) {
  const el = $(sel), pr = casePage.getBoundingClientRect(), r = el.getBoundingClientRect(), pad = 6;
  const x = r.left - pr.left - pad, y = r.top - pr.top - pad, w = r.width + 2 * pad, h = r.height + 2 * pad;
  Object.assign(halo.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: rad + 'px' });
  const sw = say.offsetWidth, sx = Math.max(8, Math.min(x, pr.width - sw - 8));
  say.style.left = sx + 'px'; say.style.top = (y + h + 12) + 'px';
  say.style.setProperty('--ax', Math.max(14, Math.min(sw - 25, x + Math.min(w / 2, 28) - sx - 5)) + 'px');
}
function endTour() { clearTimeout(tourT); tourT = null; tourAt = tourShown = -1; coach.hidden = true; coach.classList.remove('swap'); }
function showTip(n, auto) {
  clearTimeout(tourT); tourT = null;
  const first = tourAt < 0, [sel, rad, title, text] = tourPlan[n];
  tourAt = n;
  if (!first) coach.classList.add('swap');
  setTimeout(() => {
    if (tourAt !== n) return;   // a quicker click has already moved on
    tourShown = n;
    $('b', say).textContent = title; $('span', say).textContent = text; $('small', say).textContent = `${n + 1} / ${tourPlan.length}`;
    tipBack.disabled = n === 0; tipNext.textContent = n === tourPlan.length - 1 ? 'Done' : 'Next →';
    if (first) { coach.classList.add('jump'); coach.hidden = false; }
    placeCoach(sel, rad);
    if (first) { void halo.offsetWidth; coach.classList.remove('jump'); }
    coach.classList.remove('swap');
  }, first ? 0 : 220);
  if (auto) tourT = setTimeout(() => { if (n + 1 < tourPlan.length) showTip(n + 1, true); else endTour(); }, TIP_MS);
}
function startTour() {
  endTour();
  tourPlan = TOUR.filter(t => inView($(t[0])));
  if (tourPlan.length) showTip(0, true);
}
tipBack.addEventListener('click', () => { if (tourShown > 0) showTip(tourShown - 1, false); });
tipNext.addEventListener('click', () => { if (tourShown + 1 < tourPlan.length) showTip(tourShown + 1, false); else endTour(); });
$('.x', say).addEventListener('click', endTour);
if (!reduce) {
  new IntersectionObserver(ens => ens.forEach(en => {
    if (en.intersectionRatio >= .98 && guideArmed) { guideArmed = false; clearTimeout(tourT); tourT = setTimeout(startTour, 600); }
    else if (!en.isIntersecting && (tourT || tourAt >= 0)) endTour();
  }), { threshold: [0, .98] }).observe(toolbar);
  // re-armed only once the whole report page has left the screen, so scrolling through the report itself does not bring the guide back
  new IntersectionObserver(ens => ens.forEach(en => { if (!en.isIntersecting) guideArmed = true; })).observe(casePage);
}
casePage.addEventListener('pointerdown', e => { if (!e.target.closest('#tipsBtn, .coach .say')) endTour(); }, true);
tipsBtn.addEventListener('click', startTour);
addEventListener('keydown', e => { if (e.key === 'Escape' && tourAt >= 0) endTour(); });
/* a late font or a new request reflows the page: the halo follows its control. Only a change of width (a rotation) ends the tour; a phone's
   address bar sliding away on scroll changes just the height */
function replaceTip() { if (tourShown >= 0 && !coach.hidden) placeCoach(tourPlan[tourShown][0], tourPlan[tourShown][1]); }
new ResizeObserver(replaceTip).observe(casePage);
let tourW = innerWidth;
addEventListener('resize', () => { if (innerWidth === tourW) return replaceTip(); tourW = innerWidth; if (tourT || tourAt >= 0) endTour(); });

/* ---------- switching requests ---------- */
function loadCase(k) { cur = k; CUR = CASES[k]; curMode = 'concise'; renderHead(); renderReport(); }
function switchCase(k) {
  if (k === cur || turning) return;
  endTour();
  const top = deck.getBoundingClientRect().top;
  if (top < 0) scrollTo({ top: scrollY + top - 76, behavior: 'auto' });   // keep the deck's head in view while the page changes
  if (reduce) { loadCase(k); return; }
  turning = true; casePage.classList.add('out');
  setTimeout(() => {
    loadCase(k);
    casePage.classList.remove('out'); casePage.classList.add('in'); void casePage.offsetWidth; casePage.classList.remove('in');
    setTimeout(() => { turning = false; }, 460);
  }, 240);
}
loadCase(0);

/* ---------- lightbox ---------- */
const lb = $('#lb'), lbImg = $('#lbImg'), lbPan = $('#lbPan'), lbBoxes = $('#lbBoxes'), lbCap = $('#lbCap');
let z = { s: 1, x: 0, y: 0 }, drag = null;
function applyZ() { lbPan.style.transform = `translate(${z.x}px, ${z.y}px) scale(${z.s})`; }
function fitLightbox() {
  // small source images are shown at least 60% of the viewport height; large ones fit the viewport
  const nw = lbImg.naturalWidth || 1, nh = lbImg.naturalHeight || 1;
  const maxW = innerWidth - 48, maxH = innerHeight - 140;
  let w = Math.max(nw, Math.min(maxH * .6 * nw / nh, maxW));
  if (w > maxW) w = maxW;
  if (w * nh / nw > maxH) w = maxH * nw / nh;
  lbImg.style.width = Math.round(w) + 'px'; lbImg.style.height = 'auto';
}
lbImg.addEventListener('load', fitLightbox);
function openLightbox(src, alt, cap, boxes) {
  lbImg.style.width = ''; lbImg.src = src; lbImg.alt = alt; lbCap.textContent = cap; lbBoxes.innerHTML = boxes;
  if (lbImg.complete && lbImg.naturalWidth) fitLightbox();
  z = { s: 1, x: 0, y: 0 }; applyZ(); lb.hidden = false; document.documentElement.style.overflow = 'hidden'; $('#lbClose').focus();
}
function closeLightbox() { lb.hidden = true; document.documentElement.style.overflow = ''; }
$('#lbClose').addEventListener('click', closeLightbox);
lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });
lb.addEventListener('wheel', e => {
  e.preventDefault();
  const r = lbPan.getBoundingClientRect(), k = e.deltaY < 0 ? 1.15 : 1 / 1.15, ns = Math.min(6, Math.max(1, z.s * k));
  const px = (e.clientX - r.left) / z.s, py = (e.clientY - r.top) / z.s;   // point under cursor in image space
  z.x += px * (z.s - ns); z.y += py * (z.s - ns); z.s = ns; if (ns === 1) { z.x = 0; z.y = 0; } applyZ();
}, { passive: false });
lbPan.addEventListener('pointerdown', e => { drag = { x: e.clientX - z.x, y: e.clientY - z.y }; lbPan.setPointerCapture(e.pointerId); });
lbPan.addEventListener('pointermove', e => { if (drag) { z.x = e.clientX - drag.x; z.y = e.clientY - drag.y; applyZ(); } });
lbPan.addEventListener('pointerup', () => drag = null);
lbPan.addEventListener('dblclick', () => { z = { s: 1, x: 0, y: 0 }; applyZ(); });

/* ---------- bibtex copy ---------- */
$('#copyBib').addEventListener('click', async e => {
  const b = e.currentTarget, text = $('#bibText').textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; }
  catch (err) { const r = document.createRange(); r.selectNodeContents($('#bibText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }
  setTimeout(() => b.textContent = 'Copy', 1600);
});
})();
