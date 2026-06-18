const CACHE_NAME = 'accel-concert-manager-v2026-06-18-3';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/icons.svg', '/manifest.webmanifest'];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isCloudApi = (url) => url.pathname.startsWith('/api/');

function discoverAssetUrls(text, baseUrl) {
  const urls = [];
  const patterns = [
    /["'`](\.\/[^"'`]+?\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?))["'`]/g,
    /["'`](\/assets\/[^"'`]+?\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?))["'`]/g,
    /url\(([^)]+?\.(?:svg|png|jpg|jpeg|webp|woff2?))\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1].trim().replace(/^["']|["']$/g, '');
      urls.push(new URL(raw, baseUrl));
    }
  }

  return urls.filter((url) => isSameOrigin(url) && !isCloudApi(url));
}

async function cacheDiscoveredAssets(cache, urls, visited = new Set()) {
  for (const url of urls) {
    const key = url.pathname + url.search;
    if (visited.has(key)) continue;
    visited.add(key);

    try {
      const response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok) continue;

      await cache.put(key, response.clone());

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('javascript') || contentType.includes('text/css')) {
        const text = await response.text();
        await cacheDiscoveredAssets(cache, discoverAssetUrls(text, url.href), visited);
      }
    } catch {
      // Some optional assets may not be reachable during install. Runtime caching will retry later.
    }
  }
}

async function matchCached(request, url) {
  const direct = await caches.match(request);
  if (direct) return direct;
  return caches.match(url.pathname + url.search);
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const indexResponse = await fetch('/index.html', { cache: 'no-store' });
  const indexHtml = await indexResponse.clone().text();
  await cache.put('/index.html', indexResponse);

  const assetUrls = Array.from(indexHtml.matchAll(/(?:src|href)="([^"]+)"/g))
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => isSameOrigin(url) && !isCloudApi(url))
    .map((url) => url.pathname + url.search);

  await cacheDiscoveredAssets(cache, assetUrls.map((url) => new URL(url, self.location.origin)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !isSameOrigin(url) || isCloudApi(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      matchCached(request, url).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => matchCached(request, url))
  );
});
