'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {trustFiles, paidSalesReadiness} = require('./lib/customer-trust.cjs');
const root = path.join(__dirname, '..');
const flags = process.argv.slice(2);
assert.ok(flags.every(flag => ['--check', '--require-paid-sales'].includes(flag)), 'Usage: build-customer-trust.cjs [--check] [--require-paid-sales]');
const config = require('../config/customer-trust.json');
const files = trustFiles(config);
if (flags.includes('--require-paid-sales')) {
  const ledger = require('../public/route-release-evidence.json');
  const readiness = paidSalesReadiness(config, ledger, {
    routeExists: route => fs.existsSync(path.join(root, 'public', route.slice(1), 'index.html'))
  });
  console.log(JSON.stringify(readiness, null, 2));
  if (!readiness.ready) process.exitCode = 1;
} else {
  for (const [file, body] of files) {
    const target = path.join(root, file);
    if (flags.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), body, 'Customer trust drifted: ' + file);
    else { fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, body); }
  }
  console.log('AD_ASTRA_CUSTOMER_TRUST_PASS routes=4 mode=preview externalWrites=false');
}
