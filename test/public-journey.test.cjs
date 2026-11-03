'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
test('public customer entry stays on the canonical Coming Soon route',()=>{
  const home=read('index.html'),access=read('access/index.html');
  assert.match(home,/class="status" href="\/access\/"/);
  assert.match(access,/https:\/\/adastra\.global\/access\//);
  assert.match(access,/Public access coming soon/);assert.match(access,/noindex,follow/);
  assert.doesNotMatch(access,/<iframe|daylight|api\/ask/i);
  const scripts=[...access.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(scripts,['/access/app.js']);
  assert.match(access,/<form\b[^>]*id="early-access-form"[^>]*aria-labelledby="early-access-title"/);
});
test('intelligence and brain entry routes exist with accurate release information',()=>{
  for(const route of ['intelligence','brain']){
    const html=read(route+'/index.html');
    assert.ok(html.includes('https://adastra.global/'+route+'/'));
    assert.match(html,/private development/i);assert.match(html,/noindex,follow/);
    assert.doesNotMatch(html,/<form|<iframe|api\/ask/i);
  }
});
test('private surfaces have readable initial status while protected content remains hidden',()=>{
  const platform=read('platform/index.html'),knowledge=read('knowledge/index.html');
  const gate=platform.match(/<section\b[^>]*id="platform-auth"[^>]*>/)[0];
  assert.doesNotMatch(gate,/\bhidden\b/);assert.match(platform,/<main\b[^>]*id="platform-content"[^>]*\bhidden\b/);
  assert.match(platform,/<noscript>/);
  assert.match(knowledge,/<button\b[^>]*id="live-ai-submit"[^>]*disabled[^>]*data-available="false"/);
});
test('unauthenticated knowledge visit waits on the canonical page with an explicit sign-in link',async()=>{
  let redirected=false,mainVisible=false;
  const message={textContent:''},link={href:'',textContent:''};
  const gate={hidden:false,querySelector:selector=>selector==='p'?message:link};
  const context={URL,URLSearchParams,AbortSignal,console,
    location:{origin:'https://adastra.global',pathname:'/knowledge/',search:'?mode=learn',hash:'#ask-ad-astra',replace:()=>{redirected=true;}},
    document:{getElementById:id=>id==='knowledge-auth'?gate:{set hidden(value){mainVisible=!value;}}},
    window:{Clerk:{session:null,load:async()=>{}},adAstraReturnPath:value=>value}};
  vm.runInNewContext(read('knowledge/app.js'),context);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(redirected,false);assert.equal(mainVisible,false);assert.equal(gate.hidden,false);
  const destination=new URL(link.href,'https://adastra.global');
  assert.equal(destination.origin,'https://adastra.global');assert.equal(destination.pathname,'/sign-in/');
  assert.equal(destination.searchParams.get('return'),'/knowledge/?mode=learn#ask-ad-astra');
  assert.match(message.textContent,/private preview/i);
});
