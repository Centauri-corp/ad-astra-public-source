'use strict';
const fs=require('node:fs'),path=require('node:path');
const {readApproved,renderPage}=require('../lib/editorial');
const root=path.resolve(__dirname,'..'),config=require('../config/editorial-approvals.json');
(async()=>{
 const docs=await readApproved(config,process.env.SANITY_READ_TOKEN);
 const prepared=docs.map(doc=>{
  const file=path.join(root,'public-v3',doc.slug,'index.html');
  if(!fs.existsSync(file))throw Error('Approved route needs a reviewed template');
  const html=renderPage(fs.readFileSync(file,'utf8'),doc);
  return {file,html};
 });
 for(const item of prepared)fs.writeFileSync(item.file,item.html);
 console.log(JSON.stringify({event:'editorial_sync',publishedPerspective:true,approvedDocuments:docs.length,draftPublication:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
