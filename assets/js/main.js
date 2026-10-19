// Fade sections in as they scroll into view. Content stays visible without JS and for
// readers who ask for reduced motion. Positions are checked directly on scroll, resize,
// load and hash jumps, so a section can never stay hidden once it is on screen.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('main section'));
  var pending = items.slice();
  items.forEach(function (el) { el.classList.add('reveal'); });

  function update() {
    var limit = window.innerHeight * 0.92;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('is-visible'); return false; }
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    }
  }
  function showAll() { items.forEach(function (el) { el.classList.add('is-visible'); }); pending = []; }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  window.addEventListener('hashchange', update);
  window.addEventListener('beforeprint', showAll);
  update();
  setTimeout(update, 300);
  // Last resort for environments that never scroll or paint (some crawlers, previews).
  setTimeout(function () { if (document.hidden) showAll(); }, 1500);
})();

// Report examples: four tabs, each a horizontal carousel of that report's pages.
// Only the current page and its neighbours are loaded.
(function () {
  var box = document.getElementById('reports');
  var data = window.MIRA_REPORTS;
  if (!box || !data) return;

  var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
  var viewer = box.querySelector('.report-viewer');
  var track = box.querySelector('.track');
  var counter = box.querySelector('.counter');
  var dots = box.querySelector('.dots');
  var prev = box.querySelector('.prev');
  var next = box.querySelector('.next');
  var labels = {};
  tabs.forEach(function (t) { labels[t.dataset.report] = t.textContent.trim(); });

  var pages = [], index = 0, current = null;

  function load(i) {
    var slide = track.children[i];
    if (!slide || slide.dataset.loaded) return;
    var p = pages[i];
    var img = slide.querySelector('img');
    img.src = p.src;
    slide.dataset.loaded = '1';
  }

  function go(i) {
    if (!pages.length) return;
    index = Math.max(0, Math.min(pages.length - 1, i));
    track.style.transform = 'translateX(' + (-100 * index) + '%)';
    [index, index + 1, index - 1].forEach(load);
    Array.prototype.forEach.call(track.children, function (s, k) {
      s.setAttribute('aria-hidden', k === index ? 'false' : 'true');
      var a = s.querySelector('a'); if (a) a.tabIndex = k === index ? 0 : -1;
    });
    counter.textContent = (index + 1) + ' / ' + pages.length;
    Array.prototype.forEach.call(dots.children, function (d, k) {
      d.setAttribute('aria-current', k === index ? 'true' : 'false');
    });
    prev.disabled = index === 0;
    next.disabled = index === pages.length - 1;
  }

  function show(name) {
    if (name === current) return;
    current = name;
    pages = data[name] || [];
    track.innerHTML = '';
    dots.innerHTML = '';
    pages.forEach(function (p, k) {
      var slide = document.createElement('div');
      slide.className = 'slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'page');
      slide.setAttribute('aria-label', 'Page ' + (k + 1) + ' of ' + pages.length);
      var a = document.createElement('a');
      a.href = p.src; a.target = '_blank'; a.rel = 'noopener';
      var img = document.createElement('img');
      img.alt = labels[name] + ' report, page ' + (k + 1) + ' of ' + pages.length;
      img.width = p.w; img.height = p.h; img.decoding = 'async';
      a.appendChild(img); slide.appendChild(a); track.appendChild(slide);
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'dot';
      d.setAttribute('aria-label', 'Page ' + (k + 1));
      d.addEventListener('click', function () { go(k); });
      dots.appendChild(d);
    });
    tabs.forEach(function (t) {
      var on = t.dataset.report === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on) viewer.setAttribute('aria-labelledby', t.id);
    });
    go(0);
  }

  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(t.dataset.report); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var n = tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); show(n.dataset.report); e.preventDefault();
    });
  });
  prev.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(index - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(index + 1); e.preventDefault(); }
  });

  // Horizontal swipe; vertical moves still scroll the page.
  var x0 = null, y0 = null;
  viewer.addEventListener('touchstart', function (e) {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(index + (dx < 0 ? 1 : -1)); }
    x0 = null;
  });
  // A swipe that ends on a page must not also open it.
  var swiped = false;
  track.addEventListener('click', function (e) {
    if (swiped) { e.preventDefault(); swiped = false; }
  }, true);

  show(tabs[0].dataset.report);
})();
