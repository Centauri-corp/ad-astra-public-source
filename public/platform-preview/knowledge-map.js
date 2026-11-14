(() => {
  'use strict';

  function boot() {
    document.querySelectorAll('[data-knowledge-map]').forEach(root => {
      if (root.dataset.mapReady) return;
      const buttons = Array.from(root.querySelectorAll('[data-map-node]'));
      const edges = Array.from(root.querySelectorAll('[data-map-edge]'));
      const panel = root.querySelector('.ad-knowledge-map__detail');
      if (!buttons.length || !panel) return;
      const title = panel.querySelector('[data-map-title]');
      const description = panel.querySelector('[data-map-description]');
      const category = panel.querySelector('[data-map-category]');
      const related = panel.querySelector('[data-map-related]');
      if (!title || !description || !category || !related) return;

      function select(button) {
        const selected = button.dataset.mapNode;
        const neighbors = new Set();
        edges.forEach(edge => {
          const connected = edge.dataset.from === selected || edge.dataset.to === selected;
          edge.classList.toggle('is-connected', connected);
          if (connected) neighbors.add(edge.dataset.from === selected ? edge.dataset.to : edge.dataset.from);
        });
        buttons.forEach(node => {
          node.setAttribute('aria-pressed', String(node === button));
          node.classList.toggle('is-neighbor', neighbors.has(node.dataset.mapNode));
        });
        category.textContent = button.lastElementChild.textContent;
        title.textContent = button.dataset.mapTitle;
        description.textContent = button.dataset.mapDescription;
        related.textContent = 'Connected to: ' + buttons.filter(node => neighbors.has(node.dataset.mapNode)).map(node => node.lastElementChild.textContent).join(', ') + '.';
      }

      buttons.forEach((button, index) => {
        button.addEventListener('click', () => select(button));
        button.addEventListener('keydown', event => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          let next;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = buttons.length - 1;
          if (next === undefined) return;
          event.preventDefault();
          buttons[next].focus();
          select(buttons[next]);
        });
      });
      select(buttons.find(button => button.getAttribute('aria-pressed') === 'true') || buttons[0]);
      root.dataset.mapReady = 'true';
      root.classList.add('is-enhanced');
      panel.hidden = false;
      const hint = root.querySelector('[data-map-hint]');
      if (hint) hint.hidden = false;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
