const CACHE_VERSION = 'v2';
const STATIC_CACHE = `mn-static-${CACHE_VERSION}`;
const ASSET_CACHE = `mn-assets-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/images/mock-ninja-icon-transparent.png',
  '/robots.txt',
  '/sitemap.xml',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      caches.match('/index.html').then((cachedIndex) =>
        fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => response || cachedIndex || caches.match('/'))
      ).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Mock Ninja';
  const options = {
    body: data.body || 'You have a new Mock Ninja update.',
    icon: data.icon || '/images/mock-ninja-icon-transparent.png',
    badge: data.badge || '/images/mock-ninja-icon-transparent.png',
    tag: data.tag || 'mock-ninja-update',
    data: { url: data.url || '/notifications' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
