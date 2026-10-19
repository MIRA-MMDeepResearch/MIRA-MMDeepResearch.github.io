// Fade sections in as they scroll into view. Content stays visible without JS,
// for readers who ask for reduced motion, and wherever the observer never reports.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('main section'));
  var heard = false;
  function show(el) { el.classList.add('is-visible'); }

  var io = new IntersectionObserver(function (entries) {
    heard = true;
    entries.forEach(function (e) {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });

  // An observer reports every target once right after observe(); if nothing arrives,
  // this environment does not run it (hidden tab, print, some crawlers), so show all.
  setTimeout(function () {
    if (!heard) { io.disconnect(); items.forEach(show); }
  }, 1000);
  window.addEventListener('beforeprint', function () { items.forEach(show); });
})();
