/* AD ASTRA Neurobinary V5: progressive, accessible 2D particle field. */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero || !window.HTMLCanvasElement) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'neural-v5-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.querySelector('.hero-shade'));
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); return; }
  const colors = ['rgba(90,225,255,', 'rgba(247,193,107,', 'rgba(186,171,255,'];
  let w = 1, h = 1, dpr = 1, frame = 0, raf = 0, visible = true;
  const stars = Array.from({length: 140}, (_, i) => ({
    a: i * 2.399963229728653,
    r: Math.sqrt((i + .5) / 140),
    spin: .15 + (i % 7) * .045,
    size: .75 + (i % 5) * .3,
    tint: i % 3
  }));
  function resize() {
    const rect = hero.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function render(t) {
    ctx.clearRect(0, 0, w, h);
    const x = w * (w < 700 ? .53 : .69), y = h * .47;
    const radius = Math.min(w * .32, h * .42, 350);
    const phase = reduced.matches ? 0 : t * .00013;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.4);
    halo.addColorStop(0, 'rgba(54,158,220,.15)');
    halo.addColorStop(.55, 'rgba(16,103,163,.055)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2); ctx.fill();
    for (let ring = 0; ring < 4; ring++) {
      ctx.save(); ctx.translate(x,y);
      ctx.rotate(phase * (ring % 2 ? -1 : 1) + ring * .67);
      ctx.scale(1, .26 + ring * .085);
      ctx.beginPath();
      ctx.arc(0,0,radius * (.55 + ring * .13),0,Math.PI*2);
      ctx.strokeStyle = ring % 2 ? 'rgba(243,192,120,.18)' : 'rgba(100,225,255,.22)';
      ctx.lineWidth = 1.25; ctx.stroke(); ctx.restore();
    }
    stars.forEach(s => {
      const a = s.a + phase * s.spin * 3;
      const r = radius * (.16 + s.r * .85);
      const depth = Math.sin(a * 1.7);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * .56 + depth * radius * .13;
      const alpha = .23 + .62 * (1 + depth) * .5;
      ctx.fillStyle = colors[s.tint] + alpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px,py,s.size * (.65 + .45 * (depth + 1)),0,Math.PI*2); ctx.fill();
    });
  }
  function tick(t) {
    raf = 0;
    if (!visible) return;
    render(t);
    if (!reduced.matches) raf = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (visible) raf = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && !document.hidden;
    restart();
  }, {threshold: 0});
  observer.observe(hero);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && hero.getBoundingClientRect().bottom > 0;
    restart();
  });
  if (reduced.addEventListener) reduced.addEventListener('change', restart);
  window.addEventListener('resize', () => { resize(); restart(); }, {passive: true});
  resize(); restart();
})();
