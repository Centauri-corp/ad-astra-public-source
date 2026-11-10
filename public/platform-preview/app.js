'use strict';

// Local-only profile preview. It does not fetch, persist or transmit anything.
const tabs = [...document.querySelectorAll('.profile-tab')];
const label = document.getElementById('profile-label');
const copy = document.getElementById('profile-copy');
const workspace = document.getElementById('workspace-profile');
const panel = document.getElementById('profile-panel');

function selectProfile(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  label.textContent = tab.dataset.label;
  copy.textContent = tab.dataset.copy;
  workspace.textContent = tab.dataset.label;
  panel.setAttribute('aria-labelledby', tab.id);
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
  tab.addEventListener('click', () => selectProfile(tab));
  tab.addEventListener('keydown', event => {
    const next = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectProfile(tabs[next], true);
  });
});
