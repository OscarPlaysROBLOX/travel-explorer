// Tunewave service worker: app shell offline; liked songs cached when liked (needs CORS-capable source).
var CACHE='sc-hs-v1',SONGS='sc-hs-songs';
var FILES=['./','index.html','app.css','app.js','data.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES.map(function(f){return new Request(f,{cache:'reload'})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x.indexOf('sc-hs-v')===0&&x!==CACHE}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('message',function(e){if(e.data&&e.data.cache){caches.open(SONGS).then(function(c){return fetch(e.data.cache,{mode:'cors'}).then(function(r){if(r.ok)return c.put(e.data.cache,r)})}).catch(function(){})}});
function rangeFrom(resp,range){return resp.arrayBuffer().then(function(buf){var m=/bytes=(\d+)-(\d*)/.exec(range),s=+m[1],en=m[2]?+m[2]:buf.byteLength-1;
  return new Response(buf.slice(s,en+1),{status:206,headers:{'Content-Type':resp.headers.get('Content-Type')||'audio/mpeg','Content-Range':'bytes '+s+'-'+en+'/'+buf.byteLength,'Content-Length':String(en-s+1),'Accept-Ranges':'bytes'}})})}
self.addEventListener('fetch',function(e){var req=e.request;if(req.method!=='GET')return;var u=new URL(req.url);
  if(u.origin!==self.location.origin){if(u.hostname==='upload.wikimedia.org'){e.respondWith(caches.open(SONGS).then(function(c){return c.match(req.url).then(function(hit){if(!hit)return fetch(req);var r=req.headers.get('range');return r?rangeFrom(hit,r):hit})}))}return}
  e.respondWith(caches.open(CACHE).then(function(c){return c.match(req,{ignoreSearch:true}).then(function(hit){if(hit){var rg=req.headers.get('range');return rg&&/\.m4a$/.test(u.pathname)?rangeFrom(hit,rg):hit}if(req.mode==='navigate')return c.match('./').then(function(r){return r||fetch(req)});return fetch(req)})}))});
