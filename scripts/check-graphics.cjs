'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../public');
const read = (p) => fs.readFileSync(path.join(base, p), 'utf8');
const exists = (p) => {
  const full = path.resolve(base, p);
  assert.ok(full.startsWith(base + path.sep), 'unsafe graphics path: ' + p);
  assert.ok(fs.existsSync(full) && fs.statSync(full).isFile() && fs.statSync(full).size > 0, 'missing/empty asset: ' + p);
};
const home=read('index.html'), film=read('film/index.html');
const release=JSON.parse(read('release-manifest.json'));
assert.equal(release.canonical,'https://adastra.global/');
assert.equal(release.filmPublicPlayback,false,'unapproved film enabled');
assert.match(film,/PREMIERE COMING SOON/);
assert.match(film,/name="robots" content="noindex,follow"/);
assert.doesNotMatch(film,/<(?:video|audio|iframe)\b/i);
assert.match(home,/New Horizon Film — Coming Soon/);
const assets=[
'assets/ad-astra-logo-transparent.png',
'assets/ad-astra-runway-orbital-poster.jpg',
'assets/ad-astra-runway-orbital-motion.mp4',
'assets/ad-astra-runway-horizon-poster.jpg',
'assets/ad-astra-horizon-motion.mp4'
];
assets.forEach(exists);
assert.match(home,/class="hero-image"[^>]*src="assets\/ad-astra-runway-orbital-poster\.jpg"/);
assert.match(home,/class="hero-video motion-video"[^>]*muted[^>]*playsinline[^>]*preload="none"/);
assert.match(home,/class="horizon-video motion-video"[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/);
assert.match(home,/class="motion" aria-pressed="false"/);
assert.match(read('style.css'),/prefers-reduced-motion/);
console.log('AD_ASTRA_GRAPHICS_SOURCE_PASS 5 primary assets; film withheld; motion control and reduced-motion CSS present');
