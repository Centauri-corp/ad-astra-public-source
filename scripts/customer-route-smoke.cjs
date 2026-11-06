'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const origin = 'https://adastra.global';
const paths = ['/platform/', '/customer/', '/api/customer-platform', '/api/status'];
function check(route) {
  const output = execFileSync('curl', [
    '--silent', '--show-error', '--output', '/dev/null', '--max-time', '15',
    '--max-redirs', '0', '--write-out', '%{http_code}\n%{redirect_url}\n', origin + route
  ], { encoding: 'utf8', timeout: 17000 });
  const [rawStatus, redirect] = output.trimEnd().split('\n');
  const status = Number(rawStatus);
  const target = redirect ? new URL(redirect, origin) : null;
  const sso = target?.hostname === 'vercel.com' && target.pathname === '/sso-api';
  const safeRedirect = !target || (target.origin === origin && target.pathname.startsWith('/sign-in/'));
  assert.ok(!sso, `${route}: Vercel SSO blocks customer access`);
  assert.ok(status >= 200 && status < 500 && safeRedirect, `${route}: unexpected status or redirect (${status})`);
  console.log(`${route}: HTTP ${status}${target ? ' -> ' + target.pathname : ''}`);
}
try {
  paths.forEach(check);
  console.log('AD_ASTRA_CUSTOMER_ROUTE_SMOKE_PASS');
} catch (error) {
  console.error('AD_ASTRA_CUSTOMER_ROUTE_SMOKE_FAIL', error.message);
  process.exitCode = 1;
}
