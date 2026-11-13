'use strict';

const GATEWAY_CONTRACT = 'ad-astra-model-gateway/v1';

function configuration() {
  const endpoint = String(process.env.AD_ASTRA_MODEL_GATEWAY_URL || '');
  const token = String(process.env.AD_ASTRA_MODEL_GATEWAY_TOKEN || '');
  const contract = String(process.env.AD_ASTRA_MODEL_GATEWAY_CONTRACT || '');
  const mode = String(process.env.AD_ASTRA_MODEL_GATEWAY_MODE || '');
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('model_gateway_unavailable'); }
  if (url.protocol !== 'https:' || url.username || url.password || !token || contract !== GATEWAY_CONTRACT || !['provider-evaluation', 'production'].includes(mode)) {
    throw new Error('model_gateway_unavailable');
  }
  return { endpoint, token, mode };
}

/**
 * The gateway owns provider selection, fallback, regional routing and model
 * normalization. The public runtime sends only an Ad Astra profile ID.
 */
async function requestCompletion({ agentId, mode, messages, signal }) {
  const { endpoint, token, mode: gatewayMode } = configuration();
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Ad-Astra-Gateway-Contract': GATEWAY_CONTRACT,
      'X-Ad-Astra-Gateway-Mode': gatewayMode,
    },
    body: JSON.stringify({ agentId, mode, messages }),
    redirect: 'error',
    cache: 'no-store',
    signal,
  });
}

module.exports = { GATEWAY_CONTRACT, configuration, requestCompletion };
