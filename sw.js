// Service Worker for Offline PWA Support (v2.0)
const CACHE_NAME = 'mugdho-english-master-v2';
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

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
