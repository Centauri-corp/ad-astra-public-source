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
    let context;
    try { context = canvas.getContext('2d', {alpha: true}); }
    catch { /* Optional graphics must not stop product navigation. */ }
    if (!context) {
      stage.classList.add('hx-model-fallback');
      controls.querySelectorAll('button').forEach(button => { button.disabled = true; });
      readout.querySelector('small').textContent = 'Static illustration / interactive rendering unavailable';
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let mode = 'knowledge';
    let paused = reduced.matches || Boolean(navigator.connection?.saveData);
    let visible = true;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let rotationX = -0.18;
    let rotationY = 0.2;
    let targetX = rotationX;
    let targetY = rotationY;
    let lastTime = performance.now();
    let sceneTime = 0;

    const nodeCount = 78;
    const nodes = Array.from({length: nodeCount}, (_, index) => ({index, cluster: index % 6, seed: (index * 0.61803398875) % 1}));
    const links = [];
    for (let index = 0; index < nodeCount; index += 1) {
      links.push([index, (index + 1) % nodeCount]);
      if (index % 3 === 0) links.push([index, (index + 13) % nodeCount]);
      if (index % 5 === 0) links.push([index, (index + 29) % nodeCount]);
    }

    function position(node, time) {
      const i = node.index;
      const t = i / nodeCount;
      if (mode === 'agents') {
        const strand = i % 2 === 0 ? 1 : -1;
        const angle = t * Math.PI * 7 + strand * 0.28;
        return {
          x: Math.cos(angle) * 0.7,
          y: (t - 0.5) * 1.95,
          z: Math.sin(angle) * 0.7 + strand * 0.08
        };
      }
      if (mode === 'earth') {
        const ring = i % 3;
        const angle = t * Math.PI * 10 + ring * 1.4;
        const radius = 0.62 + ring * 0.18;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle * (ring === 1 ? 0.5 : 0.25)) * (0.26 + ring * 0.08),
          z: Math.sin(angle) * radius
        };
      }
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i + time * 0.00003;
      return {x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius};
    }

    function rotate(point) {
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const x1 = point.x * cosY - point.z * sinY;
      const z1 = point.x * sinY + point.z * cosY;
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      return {x: x1, y: point.y * cosX - z1 * sinX, z: point.y * sinX + z1 * cosX};
    }

    function project(point) {
      const scaleBase = Math.min(width, height) * 0.33;
      const perspective = 2.9 / (3.35 - point.z);
      return {
        x: width * 0.5 + point.x * scaleBase * perspective,
        y: height * 0.5 + point.y * scaleBase * perspective,
        z: point.z,
        scale: perspective
      };
    }

    function resize() {
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(360, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(sceneTime);
    }

    function draw(time) {
      context.clearRect(0, 0, width, height);
      const points = nodes.map((node) => project(rotate(position(node, time))));
      const accent = MODEL_MODES[mode].accent;

      const glow = context.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.52);
      glow.addColorStop(0, hexToRgba(accent, 0.15));
      glow.addColorStop(0.45, 'rgba(9, 31, 52, 0.11)');
      glow.addColorStop(1, 'rgba(3, 9, 17, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 0.75;
      links.forEach(([from, to]) => {
        const a = points[from];
        const b = points[to];
        const depth = Math.max(0.04, Math.min(0.34, ((a.z + b.z + 2) / 4) * 0.34));
        context.strokeStyle = hexToRgba(accent, depth);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      });

      points
        .map((point, index) => ({...point, index}))
        .sort((a, b) => a.z - b.z)
        .forEach((point) => {
          const radius = Math.max(1.2, 2.4 * point.scale);
          context.shadowBlur = point.z > 0 ? 14 : 4;
          context.shadowColor = accent;
          context.fillStyle = point.index % 11 === 0 ? '#ffffff' : hexToRgba(accent, Math.max(0.42, 0.86 * point.scale));
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fill();
        });
      context.shadowBlur = 0;
    }

    function frame(time) {
      animationFrame = 0;
      if (paused || !visible || document.hidden) return;
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      sceneTime += delta;
      rotationX += (targetX - rotationX) * 0.045;
      rotationY += (targetY - rotationY) * 0.045;
      targetY += delta * 0.00011;
      draw(sceneTime);
      animationFrame = requestAnimationFrame(frame);
    }

    function syncAnimation() {
      if (paused || !visible || document.hidden) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!animationFrame) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(frame);
      }
    }

    function setMode(nextMode) {
      if (!MODEL_MODES[nextMode]) return;
      mode = nextMode;
      controls.querySelectorAll('[data-model]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.model === mode)));
      const data = MODEL_MODES[mode];
      const label = readout.querySelector('span');
      const title = readout.querySelector('strong');
      const description = readout.querySelector('p');
      if (label) label.textContent = data.label;
      if (title) title.textContent = data.title;
      if (description) description.textContent = data.description;
      stage.style.setProperty('--hx-model-accent', data.accent);
      draw(sceneTime);
    }

    controls.querySelectorAll('[data-model]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.model)));
    const motionButton = controls.querySelector('.hx-model-motion');
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.textContent = paused ? 'Play model' : 'Pause model';
      motionButton.addEventListener('click', () => {
        paused = !paused;
        motionButton.setAttribute('aria-pressed', String(paused));
        motionButton.textContent = paused ? 'Play model' : 'Pause model';
        syncAnimation();
      });
    }

    stage.addEventListener('pointermove', (event) => {
      if (reduced.matches) return;
      const rect = stage.getBoundingClientRect();
      targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 1.25;
      targetX = ((event.clientY - rect.top) / rect.height - 0.5) * -0.72;
      if (paused) {
        rotationX = targetX; rotationY = targetY;
        draw(sceneTime);
      }
    });
    stage.addEventListener('pointerleave', () => {
      targetX = -0.18;
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      syncAnimation();
    }, {rootMargin: '180px'});
    intersectionObserver.observe(stage);

    const reducedChange = () => {
      paused = reduced.matches || Boolean(navigator.connection?.saveData);
      if (motionButton) {
        motionButton.setAttribute('aria-pressed', String(paused));
        motionButton.textContent = paused ? 'Play model' : 'Pause model';
      }
      syncAnimation();
    };
    if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', reducedChange);

    document.addEventListener('visibilitychange', syncAnimation);

    setMode('knowledge');
    resize();
    syncAnimation();
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    });
    window.addEventListener('pageshow', syncAnimation);
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
  }

  window.AD_ASTRA_HOME_NEURAL = Object.freeze({init: upgradeNeuralExperience});
})();
