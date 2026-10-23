'use strict';
const crypto = require('node:crypto');
const LIMIT = 12;
// Reserve USD 0.02 per attempt; never refund ambiguous provider failures.
// Pinned gpt-4.1-mini: <=16,384 input tokens +700 output tokens costs less
// than this at reviewed $0.40/$1.60 per million input/output token rates.
const RESERVE_MICRO_USD = 20000;
const SCRIPT = `
local now = tonumber(redis.call('TIME')[1])
local day = math.floor(now / 86400)
local function unsignedInteger(value)
  if not value or not string.match(value, '^%d+$') then return nil end
  local number = tonumber(value)
  if not number or number > 9007199254740991 then return nil end
  return number
end
local rawCount = redis.call('GET', KEYS[1])
local count = 0
local ttl = redis.call('TTL', KEYS[1])
if rawCount then
  count = unsignedInteger(rawCount)
  if not count or count < 1 or ttl < 0 or ttl > 3600 then return {-1, 0, 60} end
end
local rawDay = redis.call('HGET', KEYS[2], 'day')
local rawUsed = redis.call('HGET', KEYS[2], 'used')
local used = 0
if rawDay or rawUsed then
  local storedDay = unsignedInteger(rawDay)
  used = unsignedInteger(rawUsed)
  local budgetTtl = redis.call('TTL', KEYS[2])
  if not storedDay or not used or storedDay > day or budgetTtl < 0 or budgetTtl > 90000 then return {-1, 0, 60} end
  if storedDay < day then used = 0 end
elseif redis.call('EXISTS', KEYS[2]) ~= 0 then
  return {-1, 0, 60}
end
local reserve = tonumber(ARGV[2])
local budget = tonumber(ARGV[3])
local untilTomorrow = 86400 - (now % 86400)
if count >= tonumber(ARGV[1]) then return {0, 0, math.max(1, ttl)} end
if used + reserve > budget then return {2, 0, untilTomorrow} end
count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
redis.call('HSET', KEYS[2], 'day', day, 'used', used + reserve)
redis.call('EXPIRE', KEYS[2], untilTomorrow + 3600)
return {1, tonumber(ARGV[1]) - count, redis.call('TTL', KEYS[1])}
`;
function dailyBudget() {
  const raw = process.env.AD_ASTRA_DAILY_BUDGET_MICRO_USD;
  if (!/^\d+$/.test(raw || '')) throw new Error('budget_not_configured');
  const value = Number(raw);
  // Owner-approved ceiling: $10/day. Increasing it needs a reviewed change.
  if (!Number.isSafeInteger(value) || value < RESERVE_MICRO_USD || value > 10000000) throw new Error('budget_not_configured');
  return value;
}
function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('quota_unavailable');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('quota_unavailable');
  return { url, token };
}
async function command(args) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3000)
  });
  if (!response.ok) throw new Error('quota_unavailable');
  const data = await response.json();
  if (data.error || !Object.hasOwn(data, 'result')) throw new Error('quota_unavailable');
  return data.result;
}
async function reserve(claims) {
  const identity = crypto.createHash('sha256').update(claims.iss + '\0' + claims.sub).digest('hex');
  // All instances and environments share the owner's single $10 daily cap.
  const namespace = 'ad-astra:public:v3';
  const result = await command(['EVAL', SCRIPT, 2, `${namespace}:user:${identity}`, `${namespace}:daily`, LIMIT, RESERVE_MICRO_USD, dailyBudget()]);
  if (!Array.isArray(result) || result.length !== 3 || !result.every(Number.isSafeInteger) ||
      ![0,1,2].includes(result[0]) || result[1] < 0 || result[1] > LIMIT || result[2] < 1 || result[2] > 86400) throw new Error('quota_unavailable');
  return { allowed: result[0] === 1, budgetReached: result[0] === 2, remaining: result[1], retryAfter: result[2] };
}
module.exports = { reserve, dailyBudget, redisConfig, command, SCRIPT, LIMIT, RESERVE_MICRO_USD };
