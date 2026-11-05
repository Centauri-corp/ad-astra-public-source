'use strict';
// Private worker-side integrity verifier. The caller must supply an authenticated
// private Storage stream. No HTTP URLs, service keys, or public access are created.
const {createHash}=require('node:crypto');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/i;
const LIMITS=Object.freeze({'astra-graphics-private':10*1024*1024,'astra-video-private':256*1024*1024});
function validateDescriptor(asset){
 if(!asset||!UUID.test(asset.tenantId||'')||!UUID.test(asset.versionId||'')
   ||!SHA.test(asset.sha256||'')||!Object.hasOwn(LIMITS,asset.storageBucket||''))
   throw new Error('INVALID_PRIVATE_ARTIFACT_DESCRIPTOR');
 const path=asset.storagePath;
 if(typeof path!=='string'||!path.startsWith(asset.tenantId+'/')
   ||path.includes('..')||path.includes('\\')||path.includes('//')
   ||/[?#\u0000-\u001f]/.test(path)||path.length>500)
   throw new Error('INVALID_PRIVATE_STORAGE_PATH');
}
async function verifyPrivateArtifact(asset, readPrivateObject, options={}){
 validateDescriptor(asset);
 if(typeof readPrivateObject!=='function')throw new TypeError('Private read adapter required');
 const max=LIMITS[asset.storageBucket];
 const stream=await readPrivateObject({bucket:asset.storageBucket,path:asset.storagePath,tenantId:asset.tenantId});
 if(!stream||typeof stream[Symbol.asyncIterator]!=='function')throw new Error('PRIVATE_OBJECT_STREAM_UNAVAILABLE');
 const digest=createHash('sha256');
 let bytes=0;
 for await(const chunk of stream){
   if(!Buffer.isBuffer(chunk)&&!(chunk instanceof Uint8Array))throw new Error('NONBINARY_PRIVATE_OBJECT_CHUNK');
   bytes+=chunk.length;
   if(bytes>max)throw new Error('PRIVATE_OBJECT_TOO_LARGE');
   digest.update(chunk);
 }
 if(bytes===0)throw new Error('EMPTY_PRIVATE_OBJECT');
 const actual=digest.digest('hex');
 if(actual!==asset.sha256.toLowerCase())throw new Error('PRIVATE_OBJECT_HASH_MISMATCH');
 const at=options.nowMs===undefined?Date.now():options.nowMs;
 if(!Number.isFinite(at))throw new TypeError('Invalid evidence time');
 return Object.freeze({
   verifiedBy:'server',exists:true,sha256:actual,
   storageBucket:asset.storageBucket,storagePath:asset.storagePath,
   checkedAt:new Date(at).toISOString(),bytesVerified:bytes
 });
}
module.exports={verifyPrivateArtifact,validateDescriptor,LIMITS};
