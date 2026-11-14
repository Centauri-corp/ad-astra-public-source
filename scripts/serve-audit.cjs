'use strict';
// Loopback-only acceptance server. No provider credentials or production writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.vtt':'text/vtt','.txt':'text/plain','.xml':'application/xml'};
const apis={status:require('../api/status'),'operating-status':require('../api/operating-status'),'subscription-status':require('../api/subscription-status'),models:require('../api/models'),session:require('../api/session'),ask:require('../api/ask')};
const server=http.createServer(async(req,res)=>{
 try{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route.startsWith('/api/')){const handler=apis[route.slice(5)];if(!handler){res.writeHead(404);return res.end();}return await handler(req,res);}
  let file=path.resolve(root,'.'+decodeURIComponent(route));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.end(fs.readFileSync(file));
 }catch{if(!res.headersSent)res.writeHead(500);res.end('Audit server error');}
});
server.listen(Number(process.env.AD_ASTRA_AUDIT_PORT||4175),'127.0.0.1',()=>console.log('AD_ASTRA_AUDIT_SERVER http://127.0.0.1:'+server.address().port));
