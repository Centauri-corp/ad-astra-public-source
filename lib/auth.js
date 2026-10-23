'use strict';
const crypto = require('node:crypto');
const cache = { url: '', keys: null, until: 0, retryAt: 0, pending: null };
function configuration() {
  const issuer = process.env.AD_ASTRA_AUTH_ISSUER;
  const audience = process.env.AD_ASTRA_AUTH_AUDIENCE;
  const jwks = process.env.AD_ASTRA_AUTH_JWKS_URL;
  if (process.env.AD_ASTRA_ACCESS_MODE !== 'authenticated' ||
      issuer !== 'https://clerk.adastra.global' || audience !== 'ad-astra-workspace' ||
      jwks !== issuer + '/.well-known/jwks.json') throw new Error('auth_configuration');
  return { issuer, audience, jwks };
}
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid_token');
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.toString('base64url') !== value) throw new Error('invalid_token');
  return bytes;
}
async function keys(url, refresh = false) {
  if (cache.url !== url) Object.assign(cache, { url, keys: null, until: 0, retryAt: 0, pending: null });
  if (cache.pending) return cache.pending;
  if (cache.keys && Date.now() < cache.until && !refresh) return cache.keys;
  if (Date.now() < cache.retryAt) {
    if (cache.keys && Date.now() < cache.until) return cache.keys;
    throw new Error('auth_unavailable');
  }
  cache.retryAt = Date.now() + 30000;
  cache.pending = (async () => {
    const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('auth_unavailable');
    const data = await response.json();
    if (!Array.isArray(data.keys) || !data.keys.length || data.keys.length > 20) throw new Error('auth_unavailable');
    cache.keys = data.keys;
    cache.until = Date.now() + 300000;
    return data.keys;
  })();
  try { return await cache.pending; } finally { cache.pending = null; }
}
async function verifyToken(token, config) {
  if (typeof token !== 'string' || token.length > 12000) throw new Error('invalid_token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid_token');
  const header = JSON.parse(decode(parts[0]).toString('utf8'));
  const claims = JSON.parse(decode(parts[1]).toString('utf8'));
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      !header.kid || header.kid.length > 128 || header.crit || header.jku || header.x5u ||
      (header.typ && header.typ !== 'JWT')) throw new Error('invalid_token');
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) throw new Error('invalid_token');
  const now = Math.floor(Date.now() / 1000);
  for (const field of ['exp', 'iat', 'nbf']) if (!Number.isSafeInteger(claims[field])) throw new Error('invalid_token');
  if (claims.exp <= now || claims.nbf > now + 5 || claims.iat > now + 5 ||
      claims.exp <= claims.iat || claims.exp - claims.iat > 300 || claims.iat < now - 300 ||
      claims.iss !== config.issuer || claims.azp !== 'https://adastra.global' ||
      !/^user_[A-Za-z0-9]+$/.test(claims.sub || '') || !/^sess_[A-Za-z0-9]+$/.test(claims.sid || '') ||
      (claims.sts !== undefined && claims.sts !== 'active')) throw new Error('invalid_token');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(config.audience)) throw new Error('invalid_token');
  let set = await keys(config.jwks);
  if (!set.some(k => k.kid === header.kid)) set = await keys(config.jwks, true);
  const matches = set.filter(k => k.kid === header.kid && k.kty === 'RSA' &&
    (!k.use || k.use === 'sig') && (!k.alg || k.alg === 'RS256'));
  if (matches.length !== 1) throw new Error('invalid_token');
  const key = crypto.createPublicKey({ key: matches[0], format: 'jwk' });
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048 ||
      !crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, decode(parts[2]))) throw new Error('invalid_token');
  return claims;
}
async function authenticateRequest(req) {
  let config;
  try { config = configuration(); } catch { return { ok: false, status: 503, error: 'authentication_unavailable' }; }
  const value = req.headers?.authorization;
  if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(value)) return { ok: false, status: 401, error: 'authentication_required' };
  try { return { ok: true, claims: await verifyToken(value.slice(7), config) }; }
  catch (error) {
    const unavailable = error.message === 'auth_unavailable' || error.name === 'TimeoutError' || error.name === 'TypeError';
    return { ok: false, status: unavailable ? 503 : 401, error: unavailable ? 'authentication_unavailable' : 'authentication_invalid' };
  }
}
module.exports = { authenticateRequest, configuration, verifyToken };
