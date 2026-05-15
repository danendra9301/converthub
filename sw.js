// ConvertHUB Service Worker — minimal cache-first for static assets
const CACHE = 'converthub-v1';
const ASSETS = ['/', '/index.html', '/js/main.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only handle GET same-origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const networked = fetch(req).then(resp => {
        // Cache successful HTML/JS/CSS responses
        if (resp && resp.status === 200 && (req.destination === 'document' || req.destination === 'script' || req.destination === 'style')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});
