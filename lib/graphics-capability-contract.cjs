'use strict';
// AD ASTRA graphics capability contract. No telemetry, network calls, or runtime promotion.
const PROFILES=Object.freeze({
  static:Object.freeze({maxDpr:1,maxDrawCalls:0,maxTextureMB:0,maxParticles:0,minFps:0,postprocessing:false}),
  mobile:Object.freeze({maxDpr:1.5,maxDrawCalls:80,maxTextureMB:64,maxParticles:3500,minFps:30,postprocessing:false}),
  balanced:Object.freeze({maxDpr:2,maxDrawCalls:180,maxTextureMB:256,maxParticles:18000,minFps:45,postprocessing:true}),
  cinematic:Object.freeze({maxDpr:2,maxDrawCalls:300,maxTextureMB:512,maxParticles:60000,minFps:55,postprocessing:true})
});
const ALLOWED_PROVENANCE=new Set(['concept','synthetic','verified-data','simulation']);
function chooseGraphicsProfile(input={}){
  const {webgl2=false,webgpu=false,reducedMotion=false,saveData=false,mobile=false,highPerformance=false,explicit3DConsent=false}=input;
  if(!explicit3DConsent||reducedMotion||saveData||(!webgl2&&!webgpu))return {renderer:'static',profile:'static',budget:PROFILES.static,reason:!explicit3DConsent?'consent-required':reducedMotion?'reduced-motion':saveData?'data-saver':'gpu-unavailable'};
  const profile=mobile?'mobile':highPerformance?'cinematic':'balanced';
  // WebGPU must be independently accepted; it must not silently activate for customer traffic.
  const renderer=webgl2?'webgl2':'static';
  if(renderer==='static')return {renderer:'static',profile:'static',budget:PROFILES.static,reason:'webgpu-not-production-approved'};
  return {renderer,profile,budget:PROFILES[profile],reason:'explicit-opt-in'};
}
function validateVisualData(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('visual-data-invalid');
  if(!ALLOWED_PROVENANCE.has(data.provenance))throw Error('visual-data-provenance-required');
  if(typeof data.title!=='string'||!data.title.trim()||data.title.length>120)throw Error('visual-data-title-required');
  if(data.provenance==='verified-data'&&(!data.sourceId||!data.observedAt))throw Error('verified-data-source-and-timestamp-required');
  if(data.provenance==='simulation'&&(!data.modelId||!data.assumptions))throw Error('simulation-model-and-assumptions-required');
  if(data.customerId||data.tenantId||data.token||data.credentials)throw Error('private-identifiers-not-permitted-in-public-scene-contract');
  return {provenance:data.provenance,title:data.title,sourceId:data.sourceId||null,observedAt:data.observedAt||null,modelId:data.modelId||null,assumptions:data.assumptions||null};
}
function inspectFrameMetrics(metrics,profile){
  if(!PROFILES[profile])throw Error('unknown-graphics-profile');
  const budget=PROFILES[profile], failures=[];
  for(const k of ['drawCalls','textureMB','particles','fps','dpr'])if(typeof metrics[k]!=='number'||!Number.isFinite(metrics[k])||metrics[k]<0)failures.push('invalid-'+k);
  if(failures.length)return {pass:false,failures};
  if(metrics.drawCalls>budget.maxDrawCalls)failures.push('draw-calls-over-budget');
  if(metrics.textureMB>budget.maxTextureMB)failures.push('texture-memory-over-budget');
  if(metrics.particles>budget.maxParticles)failures.push('particles-over-budget');
  if(metrics.dpr>budget.maxDpr)failures.push('dpr-over-budget');
  if(metrics.fps<budget.minFps)failures.push('fps-below-budget');
  return {pass:failures.length===0,failures};
}
module.exports={PROFILES,chooseGraphicsProfile,validateVisualData,inspectFrameMetrics};
