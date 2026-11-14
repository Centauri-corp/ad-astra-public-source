'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeUbuntuMirrors:normalize}=require('../scripts/prepare-ci-ubuntu-mirrors.cjs');
test('Deb822 main and security mirror lists become distinct official HTTPS endpoints',()=>{
 const source='Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble noble-updates noble-backports\nComponents: main restricted universe multiverse\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n\nTypes: deb\nURIs: mirror+file:/etc/apt/apt-mirrors-security.txt\nSuites: noble-security\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n';
 const result=normalize(source);assert.match(result,/URIs: https:\/\/archive\.ubuntu\.com\/ubuntu/);assert.match(result,/URIs: https:\/\/security\.ubuntu\.com\/ubuntu/);
 assert.equal((result.match(/Signed-By: \/usr\/share\/keyrings\/ubuntu-archive-keyring.gpg/g)||[]).length,2);
 assert.ok(result.includes('Suites: noble noble-updates noble-backports'));assert.ok(result.includes('Suites: noble-security'));assert.ok(result.includes('Components: main restricted universe multiverse'));
});
test('legacy direct Azure and HTTP Ubuntu entries are normalized without changing suites',()=>{
 const result=normalize('deb http://azure.archive.ubuntu.com/ubuntu noble main\ndeb http://security.ubuntu.com/ubuntu noble-security main\n');
 assert.equal(result,'deb https://archive.ubuntu.com/ubuntu noble main\ndeb https://security.ubuntu.com/ubuntu noble-security main\n');
});
test('triple-slash mirror URIs work and the repair is idempotent',()=>{
 const result=normalize('URIs: mirror+file:///etc/apt/apt-mirrors.txt\nURIs: mirror+file:///etc/apt/apt-mirrors-security.txt\n');
 assert.equal(normalize(result),result);assert.ok(!result.includes('mirror+file:'));assert.ok(!result.includes('azure'));
});
test('unrelated repositories and signing/trust configuration remain untouched',()=>{
 const source='deb [signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/code stable main\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n';
 assert.equal(normalize(source),source);assert.ok(!normalize('URIs: mirror+file:/etc/apt/apt-mirrors.txt').includes('trusted=yes'));
});
