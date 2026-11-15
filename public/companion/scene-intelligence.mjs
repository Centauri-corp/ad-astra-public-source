// Pure route, visual-domain and voice-intent policy for the persistent companion.
// No network, DOM, browser permissions, or AI actions are performed here.
export const ROUTES=Object.freeze({
 home:Object.freeze({path:'/',domain:'origin',mode:'research',spoken:'home'}),
 products:Object.freeze({path:'/products/',domain:'data',mode:'plan',spoken:'products'}),
 solutions:Object.freeze({path:'/services/',domain:'industry',mode:'plan',spoken:'solutions'}),
 intelligence:Object.freeze({path:'/intelligence/',domain:'knowledge',mode:'research',spoken:'intelligence'}),
 workspace:Object.freeze({path:'/platform-preview/',domain:'knowledge',mode:'create',spoken:'workspace preview'}),
 space:Object.freeze({path:'/explore/',domain:'cosmos',mode:'research',spoken:'exploration'}),
 company:Object.freeze({path:'/company/',domain:'origin',mode:'research',spoken:'company'}),
 start:Object.freeze({path:'/start/',domain:'time',mode:'plan',spoken:'getting started'}),
 status:Object.freeze({path:'/status/',domain:'data',mode:'research',spoken:'service status'})
});
const alias=Object.freeze({
 home:'home',start:'start',products:'products',solutions:'solutions',
 services:'solutions',intelligence:'intelligence',workspace:'workspace',
 'workspace preview':'workspace',explore:'space',exploration:'space',space:'space',
 company:'company',status:'status','service status':'status'
});
export function routeContext(path='/'){
 const clean=typeof path==='string'?path.split(/[?#]/)[0]:'/';
 const hit=Object.entries(ROUTES).find(([,route])=>route.path===clean || (route.path!=='/'&&clean.startsWith(route.path)));
 if(hit)return Object.freeze({id:hit[0],...hit[1]});
 if(clean.startsWith('/products/'))return Object.freeze({id:'products',...ROUTES.products});
 if(clean.startsWith('/markets/'))return Object.freeze({id:'markets',path:clean,domain:'data',mode:'plan',spoken:'markets'});
 return Object.freeze({id:'other',path:clean,domain:'origin',mode:'research',spoken:'this page'});
}
export function voiceNavigationIntent(transcript){
 if(typeof transcript!=='string'||transcript.length>240)return null;
 const text=transcript.trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
 const match=/^(?:astra[, ]+)?(?:go to|navigate to|open page|show me the|take me to)\s+(.+)$/.exec(text);
 if(!match)return null;
 const destination=match[1].replace(/^the\s+/,'');
 const key=alias[destination];
 if(!key)return Object.freeze({type:'unsupported',spoken:'I can only navigate to approved AD ASTRA pages.'});
 const route=ROUTES[key];
 return Object.freeze({type:'navigation',path:route.path,spoken:'Opening '+route.spoken+'.',domain:route.domain});
}
export function sceneActivity(activity){
 if(!['idle','listening','requesting','responding','speaking','error'].includes(activity))return 'idle';
 return activity;
}
