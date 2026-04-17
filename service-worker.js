/* ============================================================
   FINANZ-CDE — SERVICE WORKER
   Estrategia: Cache-first para assets, Network-first para el HTML principal.
   Versión del cache: actualizar CACHE_VERSION cuando liberes una nueva versión.
   ============================================================ */

const CACHE_VERSION = 'finanz-cde-v5';
const CACHE_NAME = CACHE_VERSION;

// Archivos que se cachean al instalar
const PRECACHE_URLS = [
  './finanz-cde.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Fuentes de Google que también cacheamos
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700&display=swap'
];

/* ---- INSTALL ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachear archivos locales (crítico)
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ---- ACTIVATE: limpiar caches viejas ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- FETCH: Cache-first con fallback a red ---- */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Fuentes de Google: Cache-first (no cambian)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // HTML principal: Network-first (para recibir actualizaciones), fallback a cache
  if (url.pathname.endsWith('finanz-cde.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás: Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./finanz-cde.html'));
    })
  );
});
