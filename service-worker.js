const CACHE = 'microair-v1';
const OFFLINE_URL = '/Micro.Air_Lab/';

// Ресурсы для кэширования при установке
const PRECACHE = [
  '/Micro.Air_Lab/',
  '/Micro.Air_Lab/index.html',
  '/Micro.Air_Lab/manifest.json',
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Golos+Text:wght@400;500;600;700&display=swap',
];

// Установка — кэшируем основные ресурсы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        // Если часть ресурсов недоступна — всё равно устанавливаемся
        return cache.add(OFFLINE_URL);
      });
    }).then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — стратегия: сначала сеть, при ошибке — кэш
self.addEventListener('fetch', e => {
  // Только GET-запросы
  if (e.request.method !== 'GET') return;

  // Firebase запросы — всегда через сеть
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('identitytoolkit')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Сохраняем свежий ответ в кэш
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Сеть недоступна — достаём из кэша
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Если запрашивается страница — возвращаем главную
          if (e.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
