'use strict';
/** Fail-closed AD ASTRA static site route and asset integrity test. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const publicDir = path.resolve(__dirname, '../public');
const paths = [];
function crawl(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) crawl(full);
    else paths.push(full);
  }
}
crawl(publicDir);
const files = new Set(paths.map(p=>path.relative(publicDir,p).replaceAll('\\','/')));
const checked = [];
const problems = [];
function checkTarget(raw, referringPath) {
  if (!raw || /^(#|data:|blob:|mailto:|tel:|https?:|\/\/)/i.test(raw)) return;
  if (/^(?:javascript:|file:)/i.test(raw)) { problems.push('UNSAFE_LINK '+referringPath+' '+raw); return; }
  const cleaned = raw.split(/[?#]/)[0];
  if (!cleaned) return;
  const relativeDir = path.posix.dirname(referringPath);
  const normalized = path.posix.normalize(cleaned.startsWith('/') ? cleaned.slice(1) : path.posix.join(relativeDir, cleaned));
  if (normalized.startsWith('../') || normalized === '..') { problems.push('PATH_ESCAPE '+referringPath+' '+raw); return; }
  const requested = normalized.replace(/\/$/, '');
  const candidates = [requested,requested+'/index.html'].filter(Boolean);
  if (cleaned === '/') candidates.push('index.html');
  if (!candidates.some(c=>files.has(c))) problems.push('MISSING_LINK '+referringPath+' -> '+raw);
  else checked.push(raw);
}
for (const file of paths) {
  const rel = path.relative(publicDir,file).replaceAll('\\','/');
  if (!/\.(html|css)$/i.test(file)) continue;
  const source = fs.readFileSync(file,'utf8');
  if (/\.html$/i.test(file)) {
    for (const match of source.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) checkTarget(match[1], rel);
    assert.match(source, /<meta\s+name="viewport"/i,'missing viewport on '+rel);
    assert.match(source, /<title>/i,'missing title on '+rel);
  }
  for (const match of source.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    if (match[1].startsWith('#')) continue;
    checkTarget(match[1],rel);
  }
}
assert.equal(problems.length,0, 'Static link/asset integrity failure:\n'+problems.join('\n'));
console.log('AD_ASTRA_SITE_INTEGRITY_PASS checked='+checked.length+' sourceFiles='+files.size);
