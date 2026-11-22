'use strict';
(() => {
  const hosts = [...document.querySelectorAll('[data-cinematic-host]')];
  if (!hosts.length) return;
  const storageKey = 'ad-astra-graphics-scene-v1';
  let sceneId;
  try { sceneId = sessionStorage.getItem(storageKey); } catch {}
  function activate(host, scene) {
    host.style.setProperty('--evolution-art', 'url("' + scene.asset + '")');
    host.dataset.evolutionScene = scene.id;
    host.dataset.evolutionVersion = '1';
  }
  fetch('/graphics/evolution-manifest.json', {cache:'no-cache'})
    .then(response => {
      if (!response.ok) throw new Error('manifest unavailable');
      return response.json();
    })
    .then(manifest => {
      if (manifest.version !== 1 || !Array.isArray(manifest.scenes)) return;
      const scenes = manifest.scenes.filter(scene =>
        Number.isInteger(scene.index) && scene.index >= 0 && scene.index < 3 &&
        /^\/assets\/[a-z0-9-]+\.(?:png|jpg|webp)$/.test(scene.asset) &&
        scene.status === 'public-review'
      );
      if (scenes.length !== 3) return;
      for (const host of hosts) {
        const current = scenes.find(scene => scene.id === sceneId);
        const initial = scenes.find(scene => scene.index === Number(host.dataset.cinematicScene));
        const selected = current || initial || scenes[0];
        activate(host, selected);
        if (current) {
          host.dispatchEvent(new CustomEvent('ad-astra:request-scene',{detail:{index:current.index,source:'restore'}}));
        }
        host.addEventListener('ad-astra:scene-change', event => {
          const next = scenes.find(scene => scene.index === event.detail.index);
          if (!next) return;
          activate(host, next);
          try { sessionStorage.setItem(storageKey, next.id); } catch {}
        });
      }
    })
    .catch(() => {});
})();