'use strict';
(() => {
  const data = window.AD_ASTRA_HOME_DATA;
  if (!data) throw new Error('AD_ASTRA_HOME_DATA_REQUIRED');
  const {MODEL_MODES} = data;

  function upgradeNeuralExperience() {
    const lab = document.getElementById('neural-lab');
    const stage = lab && lab.querySelector('.neural-stage');
    if (!lab || !stage || stage.querySelector('#hx-neural-canvas')) return;
    lab.classList.add('hx-neural-upgraded', 'hx-reveal');
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', 'Interactive neural 3D product model');
    const canvas = document.createElement('canvas');
    canvas.id = 'hx-neural-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.prepend(canvas);
    const controls = document.createElement('div');
    controls.className = 'hx-neural-controls';
    controls.innerHTML = `
      <div role="group" aria-label="Neural model modes">
        <button type="button" aria-pressed="true" data-model="knowledge">Knowledge</button>
        <button type="button" aria-pressed="false" data-model="agents">Agents</button>
        <button type="button" aria-pressed="false" data-model="earth">Earth + Space</button>
      </div>
      <button type="button" class="hx-model-motion" aria-pressed="false">Pause model</button>`;
    stage.append(controls);
    const readout = document.createElement('div');
    readout.className = 'hx-model-readout';
    readout.setAttribute('aria-live', 'polite');
    readout.innerHTML = '<span>KNOWLEDGE GRAPH</span><strong>Connected evidence across disciplines.</strong><p>A spherical field of source, concept and reasoning nodes. The visual represents how one question can connect multiple knowledge domains.</p><small>INTERACTIVE VISUAL MODEL / NO LIVE TELEMETRY</small>';
    stage.append(readout);
    const copy = lab.querySelector('.neural-lab-copy');
    if (copy) {
      const label = copy.querySelector('.neural-technical-label');
      if (label) label.textContent = 'NEURAL 3D PRODUCT MODEL / LOCAL PROCEDURAL VISUALIZATION';
      const heading = copy.querySelector('h2');
      if (heading) heading.innerHTML = 'See the intelligence<br><em>as a living system.</em>';
      const lead = copy.querySelector('.lead');
      if (lead) lead.textContent = 'Explore three procedural 3D models for connected knowledge, governed agents and Earth-space intelligence. Every mode runs locally in your browser and sends no prompt or telemetry.';
    }
    createNeuralModel(canvas, stage, controls, readout);
  }

  function createNeuralModel(canvas, stage, controls, readout) {
    // Text and mode controls remain usable when Canvas fails.
    let context = null;
    try { context = canvas.getContext('2d', {alpha: true}); } catch (_) { /* static fallback */ }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const motionButton = controls.querySelector('.hx-model-motion');
    let mode = 'knowledge', userPaused = false, visible = false, pageHidden = false;
    let animationFrame = 0, lastDraw = null, clock = 0, width = 1, height = 1;
    let rotationX = -0.18, rotationY = 0.2, targetX = rotationX, targetY = rotationY;
    const nodeCount = 78;
    const nodes = Array.from({length: nodeCount}, (_, index) => ({index}));
    const links = [];
    for (let index = 0; index < nodeCount; index += 1) {
      links.push([index, (index + 1) % nodeCount]);
      if (index % 3 === 0) links.push([index, (index + 13) % nodeCount]);
      if (index % 5 === 0) links.push([index, (index + 29) % nodeCount]);
    }
    function globallyPaused() {
      return document.body.classList.contains('paused') || document.body.classList.contains('motion-suspended');
    }
    function canAnimate() {
      return Boolean(context) && visible && !pageHidden && !document.hidden && !userPaused
        && !reduced.matches && !connection?.saveData && !globallyPaused();
    }
    function cancel() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastDraw = null;
    }
    function position(node, time) {
      const i = node.index, t = i / nodeCount;
      if (mode === 'agents') {
        const strand = i % 2 === 0 ? 1 : -1, angle = t * Math.PI * 7 + strand * 0.28;
        return {x: Math.cos(angle) * 0.7, y: (t - 0.5) * 1.95, z: Math.sin(angle) * 0.7 + strand * 0.08};
      }
      if (mode === 'earth') {
        const ring = i % 3, angle = t * Math.PI * 10 + ring * 1.4, radius = 0.62 + ring * 0.18;
        return {x: Math.cos(angle) * radius, y: Math.sin(angle * (ring === 1 ? 0.5 : 0.25)) * (0.26 + ring * 0.08), z: Math.sin(angle) * radius};
      }
      const golden = Math.PI * (3 - Math.sqrt(5)), y = 1 - (i / (nodeCount - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y)), theta = golden * i + time * 0.00003;
      return {x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius};
    }
    function rotate(point) {
      const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
      const x = point.x * cosY - point.z * sinY, z = point.x * sinY + point.z * cosY;
      const cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
      return {x, y: point.y * cosX - z * sinX, z: point.y * sinX + z * cosX};
    }
    function project(point) {
      const scaleBase = Math.min(width, height) * 0.33, perspective = 2.9 / (3.35 - point.z);
      return {x: width * 0.5 + point.x * scaleBase * perspective, y: height * 0.5 + point.y * scaleBase * perspective, z: point.z, scale: perspective};
    }
    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const points = nodes.map(node => project(rotate(position(node, clock))));
      const accent = MODEL_MODES[mode].accent;
      const glow = context.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.52);
      glow.addColorStop(0, hexToRgba(accent, 0.15));
      glow.addColorStop(0.45, 'rgba(9, 31, 52, 0.11)');
      glow.addColorStop(1, 'rgba(3, 9, 17, 0)');
      context.fillStyle = glow; context.fillRect(0, 0, width, height); context.lineWidth = 0.75;
      links.forEach(([from, to]) => {
        const a = points[from], b = points[to];
        const depth = Math.max(0.04, Math.min(0.34, ((a.z + b.z + 2) / 4) * 0.34));
        context.strokeStyle = hexToRgba(accent, depth); context.beginPath();
        context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      });
      points.map((point, index) => ({...point, index})).sort((a, b) => a.z - b.z).forEach(point => {
        context.shadowBlur = point.z > 0 ? 14 : 4; context.shadowColor = accent;
        context.fillStyle = point.index % 11 === 0 ? '#ffffff' : hexToRgba(accent, Math.max(0.42, 0.86 * point.scale));
        context.beginPath(); context.arc(point.x, point.y, Math.max(1.2, 2.4 * point.scale), 0, Math.PI * 2); context.fill();
      });
      context.shadowBlur = 0;
    }
    function resize() {
      if (!context) return;
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(360, rect.height);
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      context.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    function frame(time) {
      animationFrame = 0;
      if (!canAnimate()) { syncMotion(); return; }
      // Animation time advances only during permitted frames, never while paused.
      if (lastDraw === null || time - lastDraw >= 1000 / 30) {
        const delta = lastDraw === null ? 0 : Math.min(75, time - lastDraw);
        lastDraw = time; clock += delta;
        rotationX += (targetX - rotationX) * 0.045;
        rotationY += (targetY - rotationY) * 0.045;
        targetY += delta * 0.00011;
        draw();
      }
      animationFrame = requestAnimationFrame(frame);
    }
    function syncMotion() {
      cancel();
      const allowed = canAnimate();
      stage.dataset.modelMotion = !context ? 'unavailable' : allowed ? 'running' : 'static';
      if (motionButton) {
        const blocked = !context || reduced.matches || Boolean(connection?.saveData) || globallyPaused();
        motionButton.disabled = blocked;
        motionButton.setAttribute('aria-pressed', String(blocked || userPaused));
        motionButton.textContent = !context ? 'Static model' : reduced.matches ? 'Reduced motion' : connection?.saveData ? 'Data saver on' : globallyPaused() ? 'Site motion paused' : userPaused ? 'Play model' : 'Pause model';
      }
      if (allowed) animationFrame = requestAnimationFrame(frame);
    }
    function setMode(nextMode) {
      if (!Object.hasOwn(MODEL_MODES, nextMode)) return;
      mode = nextMode;
      controls.querySelectorAll('[data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === mode)));
      const selected = MODEL_MODES[mode];
      for (const [selector, text] of [['span', selected.label], ['strong', selected.title], ['p', selected.description]]) {
        const node = readout.querySelector(selector); if (node) node.textContent = text;
      }
      stage.style.setProperty('--hx-model-accent', selected.accent); draw();
    }
    const buttons = Array.from(controls.querySelectorAll('[data-model]'));
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => setMode(button.dataset.model));
      button.addEventListener('keydown', event => {
        const next = {ArrowRight: (index + 1) % buttons.length, ArrowLeft: (index + buttons.length - 1) % buttons.length, Home: 0, End: buttons.length - 1}[event.key];
        if (next === undefined) return;
        event.preventDefault(); setMode(buttons[next].dataset.model); buttons[next].focus();
      });
    });
    motionButton?.addEventListener('click', () => {
      if (!context || reduced.matches || connection?.saveData || globallyPaused()) return;
      userPaused = !userPaused; syncMotion();
    });
    stage.addEventListener('pointermove', event => {
      if (!canAnimate()) return;
      const rect = stage.getBoundingClientRect();
      targetY = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 1.25;
      targetX = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * -0.72;
    });
    stage.addEventListener('pointerleave', () => { if (canAnimate()) targetX = -0.18; });
    function updateVisibility() {
      const rect = stage.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      syncMotion();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize, {passive: true});
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); syncMotion(); }, {threshold: 0.01}).observe(stage);
    } else window.addEventListener('scroll', updateVisibility, {passive: true});
    window.addEventListener('resize', updateVisibility, {passive: true});
    // Existing site-wide motion controls communicate through body classes.
    if ('MutationObserver' in window) new MutationObserver(syncMotion).observe(document.body, {attributes: true, attributeFilter: ['class']});
    if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', syncMotion);
    else reduced.addListener?.(syncMotion);
    connection?.addEventListener?.('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('pagehide', () => { pageHidden = true; syncMotion(); });
    window.addEventListener('pageshow', () => { pageHidden = false; updateVisibility(); });
    canvas.addEventListener('contextlost', event => {
      event.preventDefault(); context = null; canvas.hidden = true;
      stage.classList.add('hx-model-fallback'); syncMotion();
    });
    if (!context) { canvas.hidden = true; stage.classList.add('hx-model-fallback'); }
    setMode('knowledge'); resize(); updateVisibility();
  }

  function hexToRgba(hex, alpha) {
    const value = Number.parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + ((value >> 16) & 255) + ', ' + ((value >> 8) & 255) + ', ' + (value & 255) + ', ' + alpha + ')';
  }
  window.AD_ASTRA_HOME_NEURAL = Object.freeze({init: upgradeNeuralExperience});
})();
