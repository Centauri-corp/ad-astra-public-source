'use strict';

// The browser never chooses a provider, tenant, model or approval. The canonical
// runtime owns membership, entitlement, release and actual-cost decisions.
const PROTOCOL = 'ad-astra-customer-workspace/v1';
const BASE = 'https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-customer-workspace-';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;
const PRODUCTS = Object.freeze({day:['goal','minutes'],learn:['subject','hours'],career:['role','weeks']});
const ACTION_FIELDS = Object.freeze({status:['action'],list:['action'],get:['action','sessionId','before'],run:['action','sessionId','productId','input','question'],recover:['action','sessionId','productId','input','question']});
const MAX_RESPONSE = 1048576;
const SAFE_ERRORS = new Set(['authentication_required','authentication_invalid','customer_access_required','subscription_required','release_not_ready','request_conflict','idempotency_conflict','not_found','workspace_not_found','request_limit_reached','budget_exhausted','invalid_workspace_request','result_reconciliation_required','customer_execution_failed']);
const ERROR_ALIASES = Object.freeze({unauthorized:'authentication_invalid',customer_access_denied:'customer_access_required',
  customer_execution_not_released:'release_not_ready',capacity_reached:'request_limit_reached',invalid_contract:'invalid_workspace_request'});

function configuration() {
  const environment = process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;
  const secret = process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET;
  if (!['production','development'].includes(environment) || typeof secret !== 'string' || secret.length < 32 || secret.length > 512 || /[\s\x00-\x1f]/.test(secret)) throw Error('workspace_unavailable');
  return {environment,secret,url:BASE + environment};
}
function isObject(value) {return Boolean(value && typeof value === 'object' && !Array.isArray(value));}
function text(value, maximum, minimum=0) {return typeof value === 'string' && value.length >= minimum && value.length <= maximum;}
function validInput(productId, input) {
  if (!Object.hasOwn(PRODUCTS,productId) || !isObject(input)) return false;
  const [label,number] = PRODUCTS[productId];
  const maximum = {day:1440,learn:168,career:520}[productId];
  return Object.keys(input).length === 2 && Object.keys(input).every(key=>PRODUCTS[productId].includes(key)) &&
    text(input[label],160,1) && Boolean(input[label].trim()) && Number.isFinite(input[number]) && input[number] > 0 && input[number] <= maximum;
}
function validRequest(body) {
  if (!isObject(body) || !Object.hasOwn(ACTION_FIELDS,body.action) || Object.keys(body).some(key=>!ACTION_FIELDS[body.action].includes(key))) return false;
  if (body.action === 'get') return UUID.test(body.sessionId || '') && (body.before === undefined || UUID.test(body.before));
  if (!['run','recover'].includes(body.action)) return Object.keys(body).length === 1;
  return validInput(body.productId,body.input) && (body.sessionId === undefined || UUID.test(body.sessionId)) &&
    (body.question === undefined || (text(body.question,4000,1) && Boolean(body.question.trim()) && !/[\x00]/.test(body.question)));
}
async function boundedJson(response) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw Error('workspace_unavailable');
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE) throw Error('workspace_unavailable');
  const reader = response.body && response.body.getReader();
  if (!reader) throw Error('workspace_unavailable');
  let size = 0; const chunks = [];
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RESPONSE) {await reader.cancel();throw Error('workspace_unavailable');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
}
function date(value) {if (!text(value,40,1) || !Number.isFinite(Date.parse(value))) throw Error('workspace_unavailable');return value;}
function sessionSummary(value) {
  if (!isObject(value) || !UUID.test(value.id || '') || !Object.hasOwn(PRODUCTS,value.productId) || !text(value.title,200,1)) throw Error('workspace_unavailable');
  return {id:value.id,productId:value.productId,title:value.title,updatedAt:date(value.updatedAt)};
}
function planner(value,productId) {
  if (!isObject(value) || value.app !== productId || !text(value.title,300,1) || !text(value.metric,300) || !text(value.notice,1000) || !Array.isArray(value.items) || value.items.length > 20 || value.items.some(item=>!text(item,1000,1))) throw Error('workspace_unavailable');
  return {app:productId,title:value.title,metric:value.metric,items:value.items,notice:value.notice};
}
function citation(value) {
  if (!isObject(value) || !text(value.title,300,1) || !text(value.url,2048,1) || !UUID.test(value.sourceVersionId || '')) throw Error('workspace_unavailable');
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('workspace_unavailable');
  return {title:value.title,url:url.href,sourceVersionId:value.sourceVersionId};
}
function turn(value,productId) {
  if (!isObject(value) || !UUID.test(value.requestId || '') || !['completed','pending','failed'].includes(value.status) || !validInput(productId,value.input)) throw Error('workspace_unavailable');
  const result = value.result == null ? null : planner(value.result,productId);
  const answer = value.answer == null ? '' : value.answer;
  if (!text(answer,12000) || !Array.isArray(value.citations) || value.citations.length > 6) throw Error('workspace_unavailable');
  const usage = value.usage;
  if (!isObject(usage) || !['reserved','reconciled','overrun','pending'].includes(usage.state) || !Number.isSafeInteger(usage.reservedCents) || usage.reservedCents < 0 ||
      !(usage.actualCents === null || (Number.isSafeInteger(usage.actualCents) && usage.actualCents >= 0))) throw Error('workspace_unavailable');
  if (['reconciled','overrun'].includes(usage.state) && usage.actualCents === null) throw Error('workspace_unavailable');
  if (value.status === 'completed' && (!result || !answer.trim())) throw Error('workspace_unavailable');
  return {requestId:value.requestId,status:value.status,input:value.input,result,answer,citations:value.citations.map(citation),
    usage:{state:usage.state,reservedCents:usage.reservedCents,actualCents:usage.actualCents},createdAt:date(value.createdAt)};
}
function session(value) {
  const summary = sessionSummary(value);
  if (!Array.isArray(value.turns) || value.turns.length > 10 || !(value.nextCursor === null || UUID.test(value.nextCursor || ''))) throw Error('workspace_unavailable');
  if (new Set(value.turns.map(item=>item && item.requestId)).size !== value.turns.length) throw Error('workspace_unavailable');
  return {...summary,turns:value.turns.map(item=>turn(item,summary.productId)),nextCursor:value.nextCursor};
}
function shape(data, action, environment) {
  if (!isObject(data) || data.protocol !== PROTOCOL || data.environment !== environment || data.market !== 'US-CA' || typeof data.canExecute !== 'boolean') throw Error('workspace_unavailable');
  const output = {protocol:PROTOCOL,environment,market:'US-CA',canExecute:data.canExecute};
  if (data.releaseId !== undefined) {
    if (!(data.releaseId === null || text(data.releaseId,200,1))) throw Error('workspace_unavailable');
    output.releaseId = data.releaseId;
  }
  if (action === 'list') {
    if (!Array.isArray(data.sessions) || data.sessions.length > 50) throw Error('workspace_unavailable');
    output.sessions = data.sessions.map(sessionSummary);
    if (new Set(output.sessions.map(item=>item.id)).size !== output.sessions.length) throw Error('workspace_unavailable');
  }
  if (['get','run','recover'].includes(action)) output.session = session(data.session);
  if (['run','recover'].includes(action)) {
    if (!UUID.test(data.requestId || '') || !['completed','pending','failed'].includes(data.status) || !output.session.turns.some(item=>item.requestId===data.requestId && item.status===data.status)) throw Error('workspace_unavailable');
    output.requestId = data.requestId; output.status = data.status;
  }
  return output;
}
async function call(body,token,key,{deadline}={}) {
  if (!validRequest(body) || !text(token,12000,1)) throw Error('invalid_workspace_request');
  const config = configuration();
  const headers = {'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer ' + token,'x-ad-astra-bridge-secret':config.secret};
  if (['run','recover'].includes(body.action)) {
    if (typeof key !== 'string' || !IDEMPOTENCY_KEY.test(key)) throw Error('idempotency_key_required');
    headers['Idempotency-Key'] = key;
  }
  const timeout = Math.min(body.action === 'run' ? 50000 : 12000, deadline === undefined ? Infinity : deadline-Date.now());
  if (!Number.isFinite(timeout) || timeout <= 0) throw Error('workspace_unavailable');
  const response = await fetch(config.url,{method:'POST',headers,body:JSON.stringify({protocol:PROTOCOL,...body}),
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(Math.floor(timeout))});
  const data = await boundedJson(response);
  if (!response.ok) {
    const error = data && typeof data.error === 'string' && Object.hasOwn(ERROR_ALIASES,data.error) ? ERROR_ALIASES[data.error] : data && data.error;
    return {status:[400,401,403,404,409,413,422,429].includes(response.status)?response.status:503,
      body:{error:SAFE_ERRORS.has(error)?error:'workspace_unavailable'}};
  }
  if (![200,202].includes(response.status) || (response.status === 202 && !['run','recover'].includes(body.action))) throw Error('workspace_unavailable');
  const result = shape(data,body.action,config.environment);
  if (body.action === 'get' && result.session.id !== body.sessionId) throw Error('workspace_unavailable');
  if (['run','recover'].includes(body.action) && (result.session.productId !== body.productId || (body.sessionId && result.session.id !== body.sessionId) || (response.status === 202) !== (result.status === 'pending'))) throw Error('workspace_unavailable');
  return {status:response.status,body:result};
}
module.exports = {PROTOCOL,PRODUCTS,UUID,IDEMPOTENCY_KEY,MAX_RESPONSE,configuration,validInput,validRequest,boundedJson,shape,call};

