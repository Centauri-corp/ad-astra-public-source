'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public-v3'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');req.headers.host='adastra.global';
 if(['/api/status','/api/session','/api/ask'].includes(u.pathname))return require('..'+u.pathname)(req,res);
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(4318,'127.0.0.1',()=>console.log('AD ASTRA local QA on http://127.0.0.1:4318'));
