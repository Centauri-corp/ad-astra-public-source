'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{Readable}=require('node:stream');
const {verifyPrivateArtifact}=require('../lib/private-graphics-verifier.cjs');
const tenant='11111111-1111-4111-8111-111111111111';
const id='44444444-4444-4444-8444-444444444444';
const bytes=Buffer.from('real server-side private test artifact');
const sha256=createHash('sha256').update(bytes).digest('hex');
const asset={tenantId:tenant,versionId:id,sha256,storageBucket:'astra-graphics-private',storagePath:tenant+'/'+id+'/output'};
const read=async()=>Readable.from([bytes.subarray(0,5),bytes.subarray(5)]);
test('real streamed bytes produce a version-bound verification receipt',async()=>{
 const receipt=await verifyPrivateArtifact(asset,read,{nowMs:Date.parse('2026-11-05T12:00:00Z')});
 assert.equal(receipt.sha256,sha256);
 assert.equal(receipt.checkedAt,'2026-11-05T12:00:00.000Z');
 assert.equal(receipt.bytesVerified,bytes.length);
 assert.equal(Object.hasOwn(receipt,'contents'),false);
});
test('hash mismatch rejects non-identical asset bytes',async()=>{
 await assert.rejects(verifyPrivateArtifact({...asset,sha256:'a'.repeat(64)},read),/PRIVATE_OBJECT_HASH_MISMATCH/);
});
test('reject forged tenant path or public bucket',async()=>{
 await assert.rejects(verifyPrivateArtifact({...asset,storagePath:'other/'+id+'/output'},read),/INVALID_PRIVATE_STORAGE_PATH/);
 await assert.rejects(verifyPrivateArtifact({...asset,storageBucket:'public'},read),/INVALID_PRIVATE_ARTIFACT_DESCRIPTOR/);
});
test('reject empty objects, bad streams and corrupt chunks',async()=>{
 await assert.rejects(verifyPrivateArtifact(asset,async()=>Readable.from([])),/EMPTY_PRIVATE_OBJECT/);
 await assert.rejects(verifyPrivateArtifact(asset,async()=>null),/PRIVATE_OBJECT_STREAM_UNAVAILABLE/);
 await assert.rejects(verifyPrivateArtifact(asset,async()=>Readable.from(['text-chunk'])),/NONBINARY_PRIVATE_OBJECT_CHUNK/);
});
