'use strict';

const GATEWAY_CONTRACT = 'ad-astra-model-gateway/v2';

function configuration() {
  const budget=require('./shared-budget').configuration();
  const endpoint = String(process.env.AD_ASTRA_MODEL_GATEWAY_URL || new URL('/functions/v1/astra-model-gateway',budget.url).href);
  const contract = String(process.env.AD_ASTRA_MODEL_GATEWAY_CONTRACT || GATEWAY_CONTRACT);
  const mode = String(process.env.AD_ASTRA_MODEL_GATEWAY_MODE || '');
  // Domain-separated workload credential from the already-protected bridge root.
  // No key is returned to the browser, persisted or copied into a second store.
  const token = String(process.env.AD_ASTRA_MODEL_GATEWAY_TOKEN || require('node:crypto').createHmac('sha256',budget.secret).update(GATEWAY_CONTRACT+':'+mode+':service-auth').digest('hex'));
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('model_gateway_unavailable'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
    || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) || url.pathname!=='/functions/v1/astra-model-gateway'
    || token.length<32 || token.length>4096 || /[\r\n]/.test(token) || contract !== GATEWAY_CONTRACT || !['provider-evaluation', 'production'].includes(mode)) {
    throw new Error('model_gateway_unavailable');
  }
  return { endpoint, token, mode };
}

/**
 * The gateway owns provider selection, fallback, regional routing and model
 * normalization. The public runtime sends only an Ad Astra profile ID.
 */
async function requestCompletion({ agentId, mode, question, authorization, admission, idempotencyKey, signal }) {
  const { endpoint, token, mode: gatewayMode } = configuration();
  if(!admission?.allowed || !authorization || admission.agentId!==agentId || admission.mode!==mode
    || admission.environment!==gatewayMode || admission.expiresAt<=Date.now())throw Error('model_gateway_unavailable');
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Ad-Astra-Gateway-Contract': GATEWAY_CONTRACT,
      'X-Ad-Astra-Gateway-Mode': gatewayMode,
      'X-Ad-Astra-Customer-Authorization': authorization,
    },
    body: JSON.stringify({agentId,mode,question,environment:gatewayMode,idempotencyKey,
      requestId:admission.requestId,requestHash:admission.requestHash,
      execution:{reservationId:admission.reservationId,expiresAt:admission.expiresAt}}),
    redirect: 'error',
    cache: 'no-store',
    signal,
  });
}

module.exports = { GATEWAY_CONTRACT, configuration, requestCompletion };
