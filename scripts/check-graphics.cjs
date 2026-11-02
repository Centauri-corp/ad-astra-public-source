'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../public');
const read = (p) => fs.readFileSync(path.join(base, p), 'utf8');
const resolveAsset = (p) => {
  const full = path.resolve(base, p);
  assert.ok(full.startsWith(base + path.sep), 'unsafe graphics path: ' + p);
  assert.ok(fs.existsSync(full) && fs.statSync(full).isFile() && fs.statSync(full).size > 0, 'missing/empty asset: ' + p);
  return full;
};
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(resolveAsset(p))).digest('hex');
const home=read('index.html'), film=read('film/index.html');
const release=JSON.parse(read('release-manifest.json'));
const contract=JSON.parse(read('assets/approved-assets.json'));
assert.equal(release.canonical,'https://adastra.global/');
assert.equal(release.filmPublicPlayback,false,'unapproved film enabled');
assert.equal(release.graphicsAssetContract,'assets/approved-assets.json');
assert.equal(contract.schemaVersion,1);
assert.equal(contract.sanitySync.enabled,false,'public build must not query Sanity');
assert.equal(contract.approvedForPublicRelease,true,'graphics rights approval is not recorded');
assert.match(contract.approval.approvedBy,/\S/,'missing human graphics approver');
assert.match(contract.approval.approvedAt,/^\d{4}-\d{2}-\d{2}T/,'missing graphics approval timestamp');
assert.match(contract.approval.rightsEvidenceUrl,/^https:\/\//,'missing rights evidence URL');
assert.match(contract.approval.changeTicket,/\S/,'missing graphics approval ticket');
assert.ok(Array.isArray(contract.assets) && contract.assets.length === 5,'unexpected approved graphics asset set');
const expected = new Set([
  'assets/ad-astra-logo-transparent.png',
  'assets/ad-astra-runway-orbital-poster.jpg',
  'assets/ad-astra-runway-orbital-motion.mp4',
  'assets/ad-astra-runway-horizon-poster.jpg',
  'assets/ad-astra-horizon-motion.mp4'
]);
for (const asset of contract.assets) {
  assert.ok(expected.delete(asset.path),'unapproved or duplicate asset: '+asset.path);
  assert.equal(asset.provenanceStatus,'approved','asset provenance is not approved: '+asset.path);
  assert.match(asset.sourceReference,/\S/,'missing provenance reference: '+asset.path);
  assert.match(asset.sha256,/^[a-f0-9]{64}$/,'invalid SHA-256: '+asset.path);
  assert.equal(sha256(asset.path),asset.sha256,'asset integrity mismatch: '+asset.path);
}
assert.equal(expected.size,0,'required approved graphics assets missing');
assert.match(film,/PREMIERE COMING SOON/);
assert.match(film,/name="robots" content="noindex,follow"/);
assert.doesNotMatch(film,/<(?:video|audio|iframe)\b/i);
assert.match(home,/New Horizon Film — Coming Soon/);
assert.match(home,/class="hero-image"[^>]*src="assets\/ad-astra-runway-orbital-poster\.jpg"/);
assert.match(home,/class="hero-video motion-video"[^>]*muted[^>]*playsinline[^>]*preload="none"/);
assert.match(home,/class="horizon-video motion-video"[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/);
assert.match(home,/class="motion" aria-pressed="false"/);
assert.match(read('style.css'),/prefers-reduced-motion/);
console.log('AD_ASTRA_GRAPHICS_CONTRACT_PASS approved assets verified; film withheld; motion control and reduced-motion CSS present');
