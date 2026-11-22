'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cinema=read('public/experience/index.html');
const css=read('public/experience/experience.css');
const js=read('public/experience/experience.js');
const home=read('public/index.html');
const products=read('public/products/index.html');
const film=read('public/film/index.html');
const vercel=JSON.parse(read('vercel.json'));
const release=JSON.parse(read('public/release-manifest.json'));

test('new cinematic experience is discoverable through the already approved website route network',()=>{
 for(const html of [home,products,film])assert.match(html,/href="\/experience\//);
 assert.match(cinema,/href="\/products\//);
 assert.match(cinema,/href="\/scientific\//);
 assert.match(cinema,/href="\/journey\//);
 assert.match(cinema,/href="\/workspace\//);
 for(const id of ['origin','science','solutions'])assert.match(cinema,new RegExp('id="'+id+'"'));
 for(const id of ['origin','science','solutions'])assert.match(cinema,new RegExp('data-chapter-link="'+id+'"'));
});
test('DJI reference is interaction inspiration only; Ad Astra uses its original local media and captions',()=>{
 assert.doesNotMatch(cinema+js+css,/dji\.com|djicdn|mediaModal-module|tvp-/i);
 for(const p of [
   'public/assets/ad-astra-horizon-motion.mp4',
   'public/assets/ad-astra-horizon-motion.vtt',
   'public/assets/astra-lumen-neural-horizon.png',
   'public/assets/astra-lumen-neural-profile-canvas.png',
   'public/assets/astra-lumen-neural-brain.png',
   'public/assets/astra-lumen-neural-concierge.png'
 ])assert.ok(fs.statSync(path.join(root,p)).isFile(),p);
 assert.match(cinema,/src="\/assets\/ad-astra-horizon-motion\.mp4"/);
 assert.match(cinema,/src="\/assets\/ad-astra-horizon-motion\.vtt"/);
 assert.match(cinema,/poster="\/assets\/astra-lumen-neural-horizon\.png"/);
});
test('film modal is explicitly activated, accessible and stops playback on close',()=>{
 assert.match(cinema,/<dialog id="experience-film"/);
 assert.match(cinema,/aria-haspopup="dialog"/);
 assert.match(cinema,/data-film-open/);
 assert.match(cinema,/data-film-close aria-label="Close film"/);
 assert.match(cinema,/<video class="film-player" controls playsinline preload="none"/);
 assert.match(cinema,/<track kind="captions"/);
 assert.match(js,/dialog\.showModal\(\)/);
 assert.match(js,/dialog\.close\(\)/);
 assert.match(js,/player\.pause\(\)/);
 assert.match(js,/player\.currentTime = 0/);
 assert.match(js,/player\.muted = true/);
 assert.match(js,/lastFocus\.focus\(\)/);
 assert.doesNotMatch(js,/player\.play\(/);
 assert.doesNotMatch(cinema,/<video class="film-player"[^>]*autoplay/);
});
test('premium cinematic page retains explicit opt-in motion and accessible/low-resource fallbacks',()=>{
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/document\.hidden/);
 assert.match(js,/aria-current/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/pagehide/);
 assert.match(js,/ambient\.muted = true/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.film-dialog::backdrop/);
 assert.match(cinema,/name="robots" content="noindex,follow"/);
});
test('new film route stays review-only and cannot enable production/customer billing',()=>{
 assert.equal(release.publicLaunchEnabled,false);
 assert.equal(release.engineAvailable,false);
 assert.equal(release.filmPublicPlayback,false);
 assert.deepEqual(release.indexableRoutes,[]);
 assert.equal(vercel.git.deploymentEnabled,false);
 assert.match(cinema,/No customer billing or AI execution from this film page/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|navigator\.mediaDevices|localStorage|sessionStorage/);
});
