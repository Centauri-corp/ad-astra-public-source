/* Edestra Life optional neural field: decorative canvas, no AI calls, audio, tracking or external dependencies. */
(() => {
  "use strict";
  const canvas = document.getElementById("life-neural-field");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  const hero = canvas.closest(".hero");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");
  const state = { width: 0, height: 0, particles: [], frame: 0, active: false, visible: true };
  const TAU = Math.PI * 2;
  let raf = 0;
  let resizeObserver = null;
  let intersectionObserver = null;
  let stopAfter = 0;

  function size() {
    const rect = hero.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5);
    if (width === state.width && height === state.height && canvas.width > 0) return;
    state.width = width;
    state.height = height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 720 ? 22 : 42;
    state.particles = Array.from({ length: count }, (_, i) => ({
      angle: i * 2.39996,
      radius: 0.16 + ((i * 13) % 29) / 52,
      speed: 0.00012 + ((i * 7) % 9) / 100000,
      size: 0.65 + (i % 3) * 0.45
    }));
    render(0);
  }

  function render(time) {
    ctx.clearRect(0, 0, state.width, state.height);
    const cx = state.width * (state.width < 720 ? 0.64 : 0.77);
    const cy = state.height * 0.45;
    const r = Math.min(state.width * 0.54, state.height * 0.62);
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * (0.68 + j * 0.16), r * (0.25 + j * 0.08), -0.5 + j * 0.34, 0, TAU);
      ctx.strokeStyle = j === 1 ? "rgba(215,184,141,0.16)" : "rgba(143,215,244,0.14)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    for (const particle of state.particles) {
      const angle = particle.angle + time * particle.speed;
      const x = cx + Math.cos(angle) * r * particle.radius;
      const y = cy + Math.sin(angle) * r * particle.radius * 0.53;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, TAU);
      ctx.fillStyle = particle.size > 1 ? "rgba(216,185,138,0.48)" : "rgba(158,220,242,0.46)";
      ctx.fill();
    }
  }

  function pause() {
    state.active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function eligible() {
    return !media.matches && !document.hidden && state.visible && state.width > 0;
  }
  function loop(time) {
    if (!state.active) return;
    if (!eligible() || time > stopAfter) { pause(); return; }
    if (time - state.frame >= 33) {
      state.frame = time;
      render(time);
    }
    raf = requestAnimationFrame(loop);
  }
  function sync() {
    if (!eligible()) { pause(); render(0); return; }
    if (state.active) return;
    state.active = true;
    stopAfter = performance.now() + 12000;
    raf = requestAnimationFrame(loop);
  }
  size();
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(size);
    resizeObserver.observe(hero);
  } else window.addEventListener("resize", size, { passive: true });
  if ("IntersectionObserver" in window) {
    intersectionObserver = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      sync();
    }, { threshold: 0.1 });
    intersectionObserver.observe(hero);
  }
  document.addEventListener("visibilitychange", sync);
  if (media.addEventListener) media.addEventListener("change", sync);
  else if (media.addListener) media.addListener(sync);
  sync();
})();
