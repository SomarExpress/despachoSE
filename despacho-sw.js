// Somar Despacho — Service Worker
// Cambiar CACHE_VERSION para forzar actualización en todos los browsers
const CACHE_VERSION = 'somar-despacho-v1.0.5';
const STATIC = ['./despacho-app.html', './manifest-delivery.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: siempre intentar la red primero, cache solo como fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() =>
        caches.match(e.request).then(r => r || new Response('', { status: 503 }))
      )
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
