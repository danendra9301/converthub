// ConvertHUB Service Worker — network-first for HTML/JS/CSS to avoid stale content
// Cache version bumped so old caches are cleared automatically
const CACHE = 'converthub-v3';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Wipe ALL old caches
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const dest = req.destination;
  // Network-first for HTML/JS/CSS so updates show up immediately
  if (dest === 'document' || dest === 'script' || dest === 'style' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for other assets (fonts, images)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      }
      return resp;
    }))
  );
});

// Listen for "skip waiting" message from page to activate immediately on update
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
