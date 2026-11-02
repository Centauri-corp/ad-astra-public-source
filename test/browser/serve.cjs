'use strict';
// CI-only static fixture. No credentials, provider calls, identity or billing service.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../public');
const config = require('../../vercel.json');
const commonHeaders = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1:4173').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (pathname.startsWith('/api/')) {
    // Deliberately denied fixtures; these are not the production API handlers.
    res.writeHead(pathname === '/api/status' ? 503 : 401, {'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({available:false,authenticated:false,ok:false,error:'ci_fixture_denied'}));
    return;
  }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); }
  catch { res.writeHead(404).end(); return; }
  let stat;
  try { stat = fs.statSync(file); if (!stat.isFile()) throw new Error('not_file'); }
  catch { res.writeHead(404).end(); return; }
  const headers = {...commonHeaders,'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  let start=0, end=stat.size-1, status=200;
  if (req.headers.range) {
    if (!range) {res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}).end();return;}
    start=Number(range[1]); end=range[2] ? Math.min(Number(range[2]),stat.size-1) : stat.size-1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start>end || start>=stat.size) {res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}).end();return;}
    headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;status=206;
  }
  headers['Content-Length']=end-start+1;
  res.writeHead(status,headers);
  if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file,{start,end});
  stream.on('error',()=>res.destroy());
  res.on('close',()=>stream.destroy());
  stream.pipe(res);
});
server.listen(4173,'127.0.0.1',()=>console.log('AD_ASTRA_BROWSER_FIXTURE_READY — static files; all customer APIs denied'));
process.on('SIGTERM',()=>server.close());
