'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pass=load('projects/website-customer-experience/production-pass.json');
const families=load('config/public-product-families.json').families;
const design=load('projects/website-customer-experience/visual-standard.json');
const review=load('projects/website-customer-experience/visual-review.json');
const issues=[];
const requireCheck=(ok,message)=>{if(!ok)issues.push(message)};
requireCheck(pass.state==='HOLD' && pass.published===false,'Production pass must remain HOLD in source');
requireCheck(pass.finalReleaseDecision==='Supabase project wewznejqpnsmiwkbozgw','Supabase authority mismatch');
requireCheck(pass.publicCandidate==='codex/customer-experience-rebuild-20261113','Public candidate drift');
requireCheck(Array.isArray(families)&&families.length===6,'Expected six existing product families');
const familyPaths=new Set((pass.tracks.find(t=>t.id==='products')?.paths)||[]);
for(const f of families)requireCheck(familyPaths.has('/products/'+f.id+'/'),'Missing family route '+f.id);
const required=['products','services','visual-experience','customer-journey','global-trust','operations'];
const tracks=pass.tracks||[];
requireCheck(tracks.length===required.length,'Unexpected acceptance track count');
for(const id of required)requireCheck(tracks.some(t=>t.id===id && Array.isArray(t.acceptance)&&t.acceptance.length>=4),'Missing acceptance track '+id);
for(const item of tracks){if(item.source)requireCheck(fs.existsSync(path.join(root,item.source)),'Missing live source '+item.source);}
requireCheck(design.motion?.reducedMotion && design.motion?.pauseRequired===true,'Motion safety contract missing');
requireCheck(pass.requirements?.allowPublicBilling===false,'No public billing in draft');
requireCheck(pass.requirements?.agiCertified===false && pass.requirements?.asiCertified===false,'No unverified AGI/ASI claims');
requireCheck(review.decision==='pending'||review.decision==='approved'||review.decision==='rejected','Invalid visual review decision');
if(issues.length){console.error('Product/services production-pass contract FAILED: '+issues.join('; '));process.exitCode=1}
else console.log('Product/services production-pass contract PASS (source structure only; production HOLD; actual visual approval '+review.decision+')');
