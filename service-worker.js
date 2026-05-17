const CACHE = 'microair-v1';
const OFFLINE_URL = '/Micro.Air_Lab/';

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://hasan-rahman2008.github.io/Micro.Air_Lab/</loc>
    <lastmod>2026-05-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

const PRECACHE = [
  '/Micro.Air_Lab/',
  '/Micro.Air_Lab/index.html',
  '/Micro.Air_Lab/manifest.json',
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Golos+Text:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        return cache.add(OFFLINE_URL);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // ── Sitemap: отдаём напрямую с правильным Content-Type ──
  if (e.request.url.includes('/sitemap.xml')) {
    e.respondWith(new Response(SITEMAP_XML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      }
    }));
    return;
  }

  // Firebase запросы — всегда через сеть
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('identitytoolkit')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
