/* Faristol · service worker: l'app s'obre sense connexió. Xarxa primer (per rebre actualitzacions), memòria cau de reserva. */
const V='faristol-v44';
const CORE=['./','./index.html','./app.enc','./manifest.webmanifest','./config.js','./supabase-sync.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x.indexOf('faristol-ml')!==0).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname.endsWith('.supabase.co'))return;                 /* dades: mai a la memòria cau */
  if(u.pathname.indexOf('/ml/')>=0&&u.origin===location.origin)return;   /* models del retallador: els desa l'app (Cache Storage pròpia) */
  if(/\/onnxruntime-web@/.test(u.pathname)){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res&&res.ok){const c=res.clone();caches.open('faristol-ml-ort').then(x=>x.put(r,c));}return res;})));return;}  /* motor del retallador: fixat per versió, primer la memòria cau */
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok&&(u.origin===location.origin||/cdn|fonts/.test(u.hostname))){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}return res;}).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./index.html'):undefined))));
});
