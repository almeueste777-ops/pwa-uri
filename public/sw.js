const CACHE_NAME = 'antigravity-wms-v2';
const ASSETS_DE_CACHE = [
    '/index.html',
    '/src/css/style.css',
    '/src/js/app.js',
    '/src/js/ui.js',
    '/public/manifest.json',
    '/public/icons/icon-192.png',
    '/public/icons/icon-512.png',
    '/public/icons/icon-192-maskable.png',
    '/public/icons/icon-512-maskable.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_DE_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(chei =>
            Promise.all(chei.filter(cheie => cheie !== CACHE_NAME).map(cheie => caches.delete(cheie)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(raspunsCache => {
            if (raspunsCache) return raspunsCache;

            return fetch(event.request)
                .then(raspunsRetea => {
                    const clona = raspunsRetea.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clona));
                    return raspunsRetea;
                })
                .catch(() => caches.match('/index.html'));
        })
    );
});
