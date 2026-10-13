import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const office=JSON.parse(fs.readFileSync('assets/office.json','utf8'));
const basePath=new URL(office.siteUrl || office.previewUrl).pathname.replace(/\/$/,'');
const port=Number(process.env.NOVOKT_PORT || 4177);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);res.end();return;}
  if(basePath && pathname.startsWith(basePath+'/'))pathname=pathname.slice(basePath.length);
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{if(!fs.statSync(file).isFile())throw Error('not a file');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}${basePath}/`));
