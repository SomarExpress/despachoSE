// ════════════════════════════════════════════════════════════
// SERVICE WORKER — Somar Despacho PWA
// ════════════════════════════════════════════════════════════
const CACHE_NAME = 'somar-despacho-v1.4';

// Recursos a cachear para uso offline
const CACHE_URLS = [
  '/Riders_Somar/despacho-app.html',
  '/Riders_Somar/manifest-despacho.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Space+Mono:wght@400;700&family=Barlow:wght@400;500;600;700&display=swap'
];

// ─── INSTALL: cachear recursos esenciales ────────────────────
self.addEventListener('install', event => {
  console.log('[SW Despacho] Instalando v1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachear lo que se pueda, ignorar errores en CDNs
      return Promise.allSettled(
        CACHE_URLS.map(url => cache.add(url).catch(e => console.warn('[SW] No cacheado:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: limpiar caches anteriores ─────────────────────
self.addEventListener('activate', event => {
  console.log('[SW Despacho] Activado');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: estrategia Network First con fallback a cache ────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase: siempre red (datos en tiempo real)
  if(url.hostname.includes('supabase.co')) {
    return; // No interceptar — usar red directamente
  }

  // Cloudinary: red primero, cache como fallback
  if(url.hostname.includes('cloudinary.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // App HTML: Network First — siempre fresco si hay red
  if(url.pathname.includes('despacho-app.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Actualizar cache con versión fresca
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto: Cache First (fuentes, Leaflet, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// ─── PUSH: notificaciones push (futuro) ──────────────────────
self.addEventListener('push', event => {
  if(!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Somar Despacho', {
    body: data.body || '',
    icon: 'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    badge: 'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'despacho',
    data: { url: data.url || '/Riders_Somar/despacho-app.html' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:'window' }).then(clientList => {
      for(const client of clientList) {
        if(client.url.includes('despacho-app') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || '/Riders_Somar/despacho-app.html');
    })
  );
});
