'use strict';
const stage = document.querySelector('.stage-orbit');
const readout = document.querySelector('.stage-readout');
for (const detail of document.querySelectorAll('details[data-product-direction]')) {
  function showSelection() {
    if (!detail.open) return;
    stage.dataset.motif = detail.dataset.motif;
    readout.querySelector('[data-product-title]').textContent = detail.querySelector('summary span').textContent;
    readout.querySelector('[data-product-copy]').textContent = detail.querySelector('p').textContent;
    readout.querySelector('[data-product-label]').textContent = detail.querySelector('summary small').textContent;
  }
  detail.addEventListener('toggle', showSelection);
  showSelection();
}
