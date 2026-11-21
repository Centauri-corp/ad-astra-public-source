'use strict';

const VERSION='1.0.0';
const DOMAINS=Object.freeze([
 'space-earth','arts-culture','medical-health','science','engineering','geotechnology',
 'education','law-civic','economics','environment','technology','accessibility'
]);
const STAGES=Object.freeze(['arrive','orient','connect','understand','continue']);

function assertDomain(domain){
 if(typeof domain!=='string'||!DOMAINS.includes(domain))throw Error('atlas-domain-invalid');
 return domain;
}
function assertStage(stage){
 if(typeof stage!=='string'||!STAGES.includes(stage))throw Error('atlas-stage-invalid');
 return stage;
}
function createAtlasSession(input={}){
 const domain=assertDomain(input.domain||'accessibility');
 const stage=assertStage(input.stage||'arrive');
 return Object.freeze({
  schema:'ad-astra/atlas-session/v1',
  version:VERSION,
  domain,
  stage,
  mode:'preview',
  liveProvider:false,
  voice:{
   activated:Boolean(input.voiceActivated===true),
   transcriptRetention:'none',
   response:'local-preview'
  },
  execution:{
   toolsEnabled:false,
   humanConfirmationRequired:true
  },
  tenantData:false,
  telemetry:false
 });
}
function resolveAtlasIntent(input={}){
 const session=createAtlasSession(input);
 return Object.freeze({
  ...session,
  nextRoute:session.stage==='continue'?'/products/':'/atlas/',
  action:'route-only',
  claims:'directional-only'
 });
}
function getAtlasEngineContract(){
 return Object.freeze({
  schema:'ad-astra/atlas-engine-adapter/v1',
  mode:'fail-closed-preview',
  provider:'governed-ai-engine',
  liveProvider:false,
  voiceConsent:'explicit-user-action',
  transcriptRetention:'none-by-default',
  sessionPersistence:'none-by-default',
  toolExecution:'human-confirmed',
  telemetry:false
 });
}
module.exports={VERSION,DOMAINS,STAGES,createAtlasSession,resolveAtlasIntent,getAtlasEngineContract};
