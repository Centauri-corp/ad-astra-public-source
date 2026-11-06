'use strict';

const crypto = require('node:crypto');
const { command } = require('./quota');

const TTL_SECONDS = 86400;
const MAX_RECORD_BYTES = 12000;

// Claiming and completing the key are separate atomic Redis operations. A
// pending claim intentionally remains fail-closed if the process disappears
// after the provider call; a retry cannot dispatch a second provider request
// without reconciliation.
const CLAIM_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current then return {0, current} end
local pending = 'PENDING:' .. ARGV[1]
redis.call('SET', KEYS[1], pending, 'EX', ARGV[2])
return {1, pending}
`;

const COMPLETE_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], 'COMPLETE:' .. ARGV[2], 'EX', ARGV[3])
return 1
`;

const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

function keyFor(claims, idempotencyKey) {
  if (!claims || typeof claims.iss !== 'string' || typeof claims.sub !== 'string') {
    throw new Error('idempotency_unavailable');
  }
  if (!/^[A-Za-z0-9._~-]{8,200}$/.test(idempotencyKey || '')) {
    throw new Error('idempotency_key_invalid');
  }
  const tenant = typeof claims.org_id === 'string'
    ? claims.org_id
    : typeof claims.tenant_id === 'string' ? claims.tenant_id : '';
  const digest = crypto.createHash('sha256')
    .update(`ad-astra:public:v3\0${claims.iss}\0${tenant}\0${claims.sub}\0${idempotencyKey}`)
    .digest('hex');
  return `ad-astra:public:v3:idempotency:${digest}`;
}

function decodeRecord(value, fingerprint) {
  if (typeof value !== 'string' || !value.startsWith('COMPLETE:')) return null;
  try {
    const record = JSON.parse(Buffer.from(value.slice('COMPLETE:'.length), 'base64url').toString('utf8'));
    if (!record || record.fingerprint !== fingerprint ||
        !Number.isSafeInteger(record.status) ||
        !record.payload || typeof record.payload !== 'object' || Array.isArray(record.payload)) {
      throw new Error('idempotency_conflict');
    }
    return {
      status: record.status,
      payload: record.payload,
      headers: record.headers && typeof record.headers === 'object' ? record.headers : {},
    };
  } catch (error) {
    if (error.message === 'idempotency_conflict') throw error;
    throw new Error('idempotency_unavailable');
  }
}

function encodeRecord(record) {
  const encoded = Buffer.from(JSON.stringify(record), 'utf8').toString('base64url');
  if (Buffer.byteLength(encoded, 'utf8') > MAX_RECORD_BYTES) throw new Error('idempotency_record_too_large');
  return encoded;
}

async function begin(claims, idempotencyKey, fingerprint) {
  const key = keyFor(claims, idempotencyKey);
  if (!/^[a-f0-9]{64}$/.test(fingerprint || '')) throw new Error('idempotency_unavailable');
  const result = await command(['EVAL', CLAIM_SCRIPT, 1, key, fingerprint, TTL_SECONDS]);
  if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) || typeof result[1] !== 'string') {
    throw new Error('idempotency_unavailable');
  }
  if (result[0] === 1) return { status: 'new', key, pending: `PENDING:${fingerprint}` };
  if (result[1] === `PENDING:${fingerprint}`) return { status: 'in_progress', key, pending: result[1] };
  const replay = decodeRecord(result[1], fingerprint);
  if (replay) return { status: 'replay', key, record: replay };
  throw new Error(result[1].startsWith('PENDING:') ? 'idempotency_conflict' : 'idempotency_unavailable');
}

async function complete(claims, idempotencyKey, fingerprint, status, payload, headers = {}) {
  const key = keyFor(claims, idempotencyKey);
  if (!/^[a-f0-9]{64}$/.test(fingerprint || '') || !Number.isSafeInteger(status) ||
      !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('idempotency_unavailable');
  }
  const encoded = encodeRecord({ fingerprint, status, payload, headers });
  const result = await command(['EVAL', COMPLETE_SCRIPT, 1, key, `PENDING:${fingerprint}`, encoded, TTL_SECONDS]);
  if (result !== 1) throw new Error('idempotency_unavailable');
}

async function release(claims, idempotencyKey, fingerprint) {
  const key = keyFor(claims, idempotencyKey);
  const result = await command(['EVAL', RELEASE_SCRIPT, 1, key, `PENDING:${fingerprint}`]);
  if (result !== 1) throw new Error('idempotency_unavailable');
}

module.exports = { begin, complete, release, keyFor, CLAIM_SCRIPT, COMPLETE_SCRIPT, RELEASE_SCRIPT, TTL_SECONDS };
