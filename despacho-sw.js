// Somar Despacho — Service Worker
const CACHE_VERSION = 'somar-despacho-v2.0.07';
const STATIC = ['./index.html', './manifest-despacho.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c=>c.addAll(STATIC).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) { e.respondWith(fetch(e.request).catch(()=>new Response('',{status:503}))); return; }
  e.respondWith(fetch(e.request).then(r=>{ if(r&&r.status===200){ const cl=r.clone(); caches.open(CACHE_VERSION).then(c=>c.put(e.request,cl)); } return r; }).catch(()=>caches.match(e.request).then(r=>r||new Response('',{status:503}))));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('push', e => {
  let d={}; try{ d = e.data?e.data.json():{}; }catch(_){ d={title:'Somar Despacho', body:e.data?e.data.text():''}; }
  e.waitUntil(self.registration.showNotification(d.title||'Somar Despacho', {
    body:d.body||'', icon:'./icon-192.png', badge:'./icon-192.png',
    vibrate:[300,150,300,150,300], tag:'somar-'+(d.id||Date.now()),
    renotify:true, requireInteraction:true, data:d.data||{}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  let url = './';
  if (data.pedido_id) url = './?pedido='+data.pedido_id;
  else if (data.rider_id) url = './?rider='+data.rider_id;
  else if (data.factura_id) url = './?factura='+data.factura_id;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for (const c of cs){ if('focus' in c){ c.postMessage({type:'OPEN',data}); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
