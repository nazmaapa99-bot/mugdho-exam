// Service Worker for Mugdho English Master (v3.0 - Network First PWA)
const CACHE_NAME = 'mugdho-english-master-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/audio.js',
  './js/app.js',
  './data/verbs.js',
  './data/rearrange.js',
  './data/articles.js',
  './data/prepositions.js',
  './data/changing_sentences.js',
  './data/punctuations.js',
  './data/tense_change.js',
  './data/parts_of_speech.js',
  './data/verb_forms.js',
  './manifest.json'
];

// Install: pre-cache all assets and activate immediately
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW v3] Pre-caching all 9 subject assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate: purge all legacy caches (v1, v2, etc.) and take control of all tabs
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[SW v3] Purging obsolete cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST for HTML and code to ensure instant updates, Cache fallback for offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only intercept same-origin GET requests
  if (req.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  // 1. Navigation / HTML pages -> Always Network First!
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 2. JS, CSS, JSON -> Network First with Cache Fallback
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. Static assets -> Cache First with Network Fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return networkRes;
      });
    })
  );
});
