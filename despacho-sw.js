// SERVICE WORKER — Somar Despacho PWA
// Repo: somarexpress/despachoSE
const CACHE_NAME = 'somar-despacho-v2.1.17';
const STATIC = ['./index.html', './manifest-despacho.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(STATIC.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Supabase: siempre red (tiempo real)
  if (url.hostname.includes('supabase.co')) return;
  // Cloudinary: red primero
  if (url.hostname.includes('cloudinary.com')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  // HTML principal: Network First
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/despachoSE/')) {
    event.respondWith(
      fetch(event.request)
        .then(r => { caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Resto: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => cached ||
      fetch(event.request).then(r => {
        if (r && r.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
        return r;
      }).catch(() => new Response('', { status: 503 }))
    )
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || 'Somar Despacho', {
    body:    data.body || '',
    icon:    'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    badge:   'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    vibrate: [200, 100, 200],
    tag:     data.tag || 'despacho',
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const c = clientList.find(x => x.url.includes('despachoSE') || x.url.includes('index.html'));
      if (c) return c.focus();
      return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
