'use strict';
(() => {
  const directions = {
    'beyond-physics': { label: 'DISCOVERY', motif: 'orbital-knowledge-field' },
    'astra-lumen': { label: 'LEARNING', motif: 'luminous-neural-core' },
    'neural-visual-experience': { label: 'VISUALIZATION', motif: 'responsive-signal-lattice' },
    'governed-workflows': { label: 'OPERATIONS', motif: 'approval-control-plane' }
  };
  const controls = [...document.querySelectorAll('[data-product-direction]')];
  const panels = [...document.querySelectorAll('[data-product-panel]')];
  const stage = document.querySelector('.stage-orbit');
  const heroLabel = document.querySelector('.hero-art [data-product-label]');
  if (!stage || !controls.length || !panels.length) return;

  function selectDirection(id) {
    if (!Object.hasOwn(directions, id) || !panels.some(panel => panel.dataset.productPanel === id)) return;
    const direction = directions[id];
    stage.dataset.motif = direction.motif;
    if (heroLabel) heroLabel.textContent = direction.label + ' / EXPLICIT PUBLIC PREVIEW';
    panels.forEach(panel => { panel.hidden = panel.dataset.productPanel !== id; });
    controls.forEach(button => {
      const active = button.dataset.productDirection === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  controls.forEach((button, index) => {
    button.addEventListener('click', () => selectDirection(button.dataset.productDirection));
    button.addEventListener('blur', event => {
      if (controls.includes(event.relatedTarget)) return;
      // Returning with Tab should enter on the selected direction.
      controls.forEach(control => { control.tabIndex = control.getAttribute('aria-selected') === 'true' ? 0 : -1; });
    });
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % controls.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + controls.length) % controls.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = controls.length - 1;
      else return;
      event.preventDefault();
      // Focus does not change the scene: Enter, Space or a click explicitly selects it.
      controls.forEach(control => { control.tabIndex = -1; });
      controls[next].tabIndex = 0;
      controls[next].focus();
    });
  });
  selectDirection('beyond-physics');
})();
