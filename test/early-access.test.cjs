'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/access/index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'public/access/app.js'),'utf8');
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/release-manifest.json'),'utf8'));
const functionSource=fs.readFileSync(path.join(root,'supabase/functions/astra-early-access/index.ts'),'utf8');
const endpoint='https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-early-access';

test('early access is consent gated without claiming account or AI activation',()=>{
  assert.match(html,/<form\b[^>]*id="early-access-form"[^>]*aria-labelledby="early-access-title"/);
  assert.match(html,/id="early-email"[^>]+required/);
  assert.match(html,/id="early-consent"[^>]+required/);
  assert.match(html,/does not create an account, start a subscription or enable AI execution/i);
  assert.match(html,/<form\b/i,'Early access must use native form semantics.');
  assert.equal(manifest.earlyAccessIntake,'public-consent-gated-no-spend');
});

test('browser client sends only bounded lead fields to the pinned function',()=>{
  assert.match(client,new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  for(const field of ['email','full_name','company','website','consent'])assert.match(client,new RegExp(field));
  assert.doesNotMatch(client,/service[_-]?role|apikey|authorization|OPENAI|STRIPE/i);
  assert.match(client,/credentials: 'omit'/);
  assert.match(client,/AbortController/);
});

test('CSP permits the exact intake origin and no broad Supabase wildcard',()=>{
  const csp=config.headers[0].headers.find((header)=>header.key==='Content-Security-Policy').value;
  assert.match(csp,/connect-src[^;]*https:\/\/wewznejqpnsmiwkbozgw\.supabase\.co/);
  assert.doesNotMatch(csp,/https:\/\/\*\.supabase\.co/);
});

test('tracked Edge Function remains public-intake only and server privileged',()=>{
  assert.match(functionSource,/const allowedOrigins = new Set/);
  assert.match(functionSource,/MAX_BODY_BYTES = 4096/);
  assert.match(functionSource,/astra_public_lead_rate_limit/);
  assert.match(functionSource,/astra_public_lead_intake/);
  assert.match(functionSource,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(functionSource,/OPENAI|STRIPE|sendEmail|send_message/i);
});
