'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/index.html');
const director=read('public/graphics/cinematic-director.js');
const style=read('public/graphics/cinematic-director.css');
const app=read('public/app.js');
const lumen=read('public/graphics/lumen-arrival.js');
const media=JSON.parse(read('public/graphics/cinematic-media-manifest.json'));
const film=JSON.parse(read('config/ad-astra-original-cinematic-film.v1.json'));
const release=JSON.parse(read('public/release-manifest.json'));
const vercel=JSON.parse(read('vercel.json'));

test('cinematic original media is now the hero and the spatial globe is optional',()=>{
 assert.match(html,/class="hero hero-cinema-v3"/);
 assert.match(html,/data-cinema-mode="film"/);
 assert.match(html,/class="hero-video motion-video" data-cinema-film/);
 assert.match(html,/data-cinema-film muted playsinline loop preload="none"/);
 assert.match(html,/src="assets\/ad-astra-horizon-motion\.mp4"/);
 assert.match(html,/src="assets\/ad-astra-runway-horizon-poster\.jpg"/);
 assert.match(html,/From Earth\.<br><em>Beyond the expected\./);
 assert.match(html,/data-cinema-switch aria-pressed="false"/);
 assert.match(html,/href="\/experience\/"/);
 assert.match(html,/href="\/products\/"/);
 assert.match(html,/data-cinematic-host/);
 assert.match(html,/data-cinematic-journey/);
 for(const rel of ['public'+media.homepage.source,'public'+media.homepage.poster,'public'+media.fullFilm.captions]){
   assert.ok(fs.existsSync(path.join(root,rel)),rel+' must exist at exact source');
 }
 assert.doesNotMatch(html,/<h1 id="hero-title">A living stage/);
});

test('human-directed voice and typed question remain operable in a secondary section',()=>{
 assert.match(html,/class="lumen-intelligence-bridge"/);
 for(const id of ['lumen-interaction','lumen-bridge-title','lumen-form','lumen-question','lumen-example','lumen-voice','lumen-result','lumen-reply','lumen-workspace','lumen-status','lumen-listen']){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(lumen,/panel\.closest\('\.lumen-intelligence-bridge'\)/);
 assert.match(lumen,/if \(motionHost && portrait\)/);
 assert.doesNotMatch(lumen,/const hero = panel\.closest\('\.hero'\);/);
 assert.match(lumen,/form\.addEventListener\('submit'/);
 assert.match(lumen,/voice\.addEventListener\('click'/);
});

test('film and WebGL are one controlled pair, not independent video loops',()=>{
 assert.match(director,/function setMode\(next, reason = 'user'\)/);
 assert.match(director,/validModes\.includes\(next\)/);
 assert.match(director,/ad-astra:cinema-mode-change/);
 assert.match(director,/firstLayer\?\.click\(\)/);
 assert.match(director,/ambientFilm\.pause\(\)/);
 assert.match(director,/reduced\.matches \|\| saveData/);
 assert.match(app,/const spatialMode = video\.hasAttribute\('data-cinema-film'\)/);
 assert.match(app,/document\.addEventListener\('ad-astra:cinema-mode-change', syncMotion\)/);
 assert.match(app,/visibleVideos\.has\(video\)/);
 assert.match(app,/video\.play\(\)\.catch/);
 assert.doesNotMatch(director,/\.play\(/);
 assert.doesNotMatch(director,/fetch\(|setInterval\(|setTimeout\(|navigator\.mediaDevices/);
 assert.match(style,/data-cinema-mode="spatial"/);
 assert.match(style,/\.lumen-intelligence-bridge/);
 assert.match(style,/@media\(max-width:680px\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});

test('we do not mistake existing concept footage for an original approved flagship film',()=>{
 assert.equal(media.schema,'crc.ad-astra.cinematic-website-delivery/v1');
 assert.equal(media.publicDomainPromotion,false);
 assert.equal(media.videoAuditedAsPremiumFlagship,false);
 assert.equal(media.homepage.mode,'film-first');
 assert.equal(media.fullFilm.playback,'user-opt-in-modal-native-controls');
 assert.equal(film.status,'ARCHITECTURE_ONLY_NOT_RENDERED');
 assert.equal(release.publicLaunchEnabled,false);
 assert.equal(release.filmPublicPlayback,false);
 assert.deepEqual(release.indexableRoutes,[]);
 assert.equal(vercel.git.deploymentEnabled,false);
 assert.equal(media.productionGates.includes('independent-Supabase-release-case'),true);
});

test('cinematic camera pass uses source-owned GPU imagery and no autonomous render loop',()=>{
 assert.match(director,/function syncCameraPass\(\)/);
 assert.match(director,/requestAnimationFrame\(syncCameraPass\)/);
 assert.match(director,/addEventListener\('scroll', scheduleCameraPass, \{passive: true\}\)/);
 assert.match(director,/disabled = reduced\.matches \|\| saveData \|\| document\.hidden/);
 assert.match(style,/CRC CINEMATIC CAMERA PASS 2026-11-22/);
 assert.match(style,/--cinema-lens-scale/);
 assert.match(style,/@media\(forced-colors:active\)/);
 assert.doesNotMatch(director,/setInterval\(|setTimeout\(|fetch\(/);
});

test('cinematic review cut cannot silently replace a rights-unverified production film',()=>{
 const shot=media.cinematicReviewCandidate;
 assert.equal(shot.status,'RENDERED_AND_EDITED_NOT_PUBLICLY_INTEGRATED');
 assert.equal(shot.format.width,1920);
 assert.equal(shot.format.height,1080);
 assert.equal(shot.editorial.exportedDurationSeconds,30);
 assert.equal(shot.editorial.structuralCheck,'PASS');
 assert.equal(shot.editorial.creativeAcceptance,'PENDING');
 assert.equal(shot.rights,'PENDING_REVIEW');
 assert.equal(shot.websiteDelivery.replacementPerformed,false);
 assert.equal(shot.websiteDelivery.preventSignedTemporaryUrlEmbedding,true);
 assert.equal(shot.globalProductionGate,'HOLD');
 assert.equal(release.publicLaunchEnabled,false);
});
