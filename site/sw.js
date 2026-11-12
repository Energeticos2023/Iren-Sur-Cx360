const CACHE='iren-cx360-shell-v10';
const ASSETS=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./pilot-ui.js','./assets/logo-anin.png','./assets/logo-anin-dark.png','./assets/icon-192.png','./assets/icon-512.png','./assets/fonts/barlow-latin-400-normal.woff2','./assets/fonts/barlow-latin-500-normal.woff2','./assets/fonts/barlow-latin-600-normal.woff2','./assets/fonts/barlow-latin-700-normal.woff2','./assets/fonts/barlow-semi-condensed-latin-600-normal.woff2','./assets/fonts/barlow-semi-condensed-latin-700-normal.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iren-cx360-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),base=new URL('./',self.registration.scope);
 if(e.request.method!=='GET'||u.origin!==base.origin||u.search||!ASSETS.some(p=>new URL(p,base).pathname===u.pathname))return;
 // Solo interfaz estática. Nunca API, sesiones, expedientes, resultados ni enlaces privados.
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)).then(r=>r||new Response('Se requiere conexión para iniciar CX360',{status:503})));
});
