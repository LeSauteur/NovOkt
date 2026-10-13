import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dirs=['.','districts','objects'];
const pages=dirs.flatMap(dir=>fs.readdirSync(dir).filter(f=>f.endsWith('.html')).map(f=>dir==='.'?f:dir+'/'+f));
let links=0;
const styles=new Set();
const errors=[];
const office=JSON.parse(fs.readFileSync('assets/office.json','utf8'));
for(const file of pages){
  const html=fs.readFileSync(file,'utf8');
  if(office.siteUrl){
    assert(!/https?:\/\/(?:localhost|127\.0\.0\.1)/.test(html),file+': no local URL in published page');
    assert(html.includes(`<link rel="canonical" href="${new URL(file.replace(/index\.html$/,''),office.siteUrl).href}">`),file+': public canonical URL');
  }
  assert(!/Зеленьков|Народная|Народной|79381549515|938 154|50743227|DomianNov\/|315617300002118|614906633404|assets\/images\/team\/|\$\{/.test(html), file+': no previous office identity or unresolved templates');
  if(file!=='presentation.html'){
    assert(html.includes(`href="tel:${office.phoneHref}"`),file+': office contact');
    assert(html.includes(office.legalName),file+': legal entity');
    assert.match(html, /name="robots" content="noindex,follow"/,file+': local demo stays unindexed');
  }
  assert.match(html,/<html lang="ru">/,file+': language');
  assert.match(html,/<title>[^<]+<\/title>/,file+': title');
  if(file!=='presentation.html'){
    assert.equal((html.match(/<header /g)||[]).length,1,file+': one header');
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file+': one h1');
    assert.match(html,/<main id="main-content"/,file+': skip target');
  }
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=m[1].replaceAll('&amp;','&');
    if(/^(?:https?:|tel:|mailto:|data:)/.test(link))continue;
    links++;
    const u=new URL(link,'https://local.test/'+file);
    const dest=decodeURIComponent(u.pathname).replace(/^\//,'');
    const resolved=dest.endsWith('/')?dest+'index.html':dest||'index.html';
    if(!fs.existsSync(resolved)){errors.push(`${file}: missing ${link}`);continue;}
    if(resolved.endsWith('.css'))styles.add(resolved);
    if(u.hash&&resolved.endsWith('.html')){
      const target=fs.readFileSync(resolved,'utf8');
      const id=decodeURIComponent(u.hash.slice(1));
      if(!target.includes(`id="${id}"`))errors.push(`${file}: missing anchor ${link}`);
    }
  }
}
let cssAssets=0;
for(const file of styles){
  const css=fs.readFileSync(file,'utf8');
  for(const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)){
    const asset=match[2];
    if(/^(?:https?:|data:|#)/.test(asset))continue;
    cssAssets++;
    const dest=path.resolve(path.dirname(file),decodeURIComponent(asset));
    if(!fs.existsSync(dest))errors.push(`${file}: missing CSS resource ${asset}`);
  }
}
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('assets/js/place-data.js','utf8'),sandbox);
const data=sandbox.window.PLACE_DATA;
const objectPages=fs.readdirSync('objects').filter(f=>f.endsWith('.html')).sort();
assert.deepEqual(objectPages,Array.from(data.properties,p=>p.id+'.html').sort(),'no obsolete object pages');
for(const photo of [office.teamPhoto,office.frontPhoto])assert(fs.statSync(photo).size>10000,'office photo asset');
const contacts=fs.readFileSync('contacts.html','utf8');
for(const value of [office.owner,office.inn,office.ogrnip,office.legalName,office.mapUrl])assert(contacts.includes(value),'confirmed office identity: '+value);
assert.equal(new Set(data.properties.map(p=>p.id)).size,data.properties.length,'unique listing IDs');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
if(office.siteUrl){
  assert(!/localhost|127\.0\.0\.1/.test(sitemap),'public sitemap URLs');
  for(const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g))assert(match[1].startsWith(office.siteUrl),'sitemap stays under repository Pages prefix');
}
for(const p of data.properties){
  assert(p.price>0&&Number.isFinite(p.price),'source price is numeric');
  assert.match(p.source,/^https:\/\/(?:www\.|rostov\.)?cian\.ru\//,'source URL');
  assert.equal(p.verified,false,'source imports require owner confirmation');
  const html=fs.readFileSync(`objects/${p.id}.html`,'utf8');
  assert.match(html,/name="robots" content="noindex,follow"/,'unconfirmed source page must be noindex');
  assert(!sitemap.includes(`objects/${p.id}.html`),'unconfirmed source excluded from sitemap');
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS: ${pages.length} pages; ${links} local links/assets/anchors; ${cssAssets} CSS resources; ${data.properties.length} source records; indexing safeguards.`);
