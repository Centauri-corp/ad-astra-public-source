'use strict';
// Production image packaging only: resize/encode the unaltered generated masters.
// No generative editing, new claims or release approvals occur here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),collection=require('../config/story-collection.json');
const root=path.join(__dirname,'..'),input=process.argv[2];
if(!input)throw Error('Provide the reviewed local generated-master directory.');
(async()=>{
 const out=path.join(root,'public/assets/story');fs.mkdirSync(out,{recursive:true});
 const assets=[];
 for(const asset of collection.assets){
  const source=path.join(input,asset.master),meta=await sharp(source).metadata(),exports=[];
  for(const width of [960,1672]){
   if(meta.width<width)throw Error('Master is smaller than the declared export; do not invent resolution.');
   const file=path.join(out,asset.id+'-'+width+'.webp');
   const result=await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(file);
   const bytes=fs.readFileSync(file);
   exports.push({path:'/assets/story/'+path.basename(file),width:result.width,height:result.height,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  assets.push({id:asset.id,chapter:asset.chapter,alt:asset.alt,intendedRoutes:asset.routes,claimBoundary:asset.boundary,source:{tool:collection.generation.tool,date:collection.generation.date,master:asset.master,width:meta.width,height:meta.height,sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')},exports,reviewStatus:'candidate',humanVisualApproval:null,rightsApproval:null,releaseAuthorization:false});
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'ad-astra-cinematic-story-assets/v1',brand:'AD ASTRA',conceptArt:true,releaseAuthorization:false,assets},null,2)+'\n');
 console.log('Exported '+assets.length+' original story assets / '+assets.flatMap(a=>a.exports).length+' responsive WebP files. No upscale.');
})().catch(error=>{console.error(error);process.exitCode=1;});
