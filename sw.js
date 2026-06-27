const CACHE_NAME = 'antigravity-wms-v10';

// Toate căile sunt relative la scope-ul Service Worker-ului (rădăcina site-ului),
// ca aplicația să funcționeze și când e găzduită într-un subdirector (ex: GitHub Pages).
const BAZA = self.registration.scope;
const ASSETS_DE_CACHE = [
    'index.html',
    'src/css/style.css',
    'src/css/tailwind.generated.css',
    'src/js/app.js',
    'src/js/ui.js',
    'src/db/local-db.js',
    'public/manifest.json',
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-192-maskable.png',
    'public/icons/icon-512-maskable.png',
].map(cale => new URL(cale, BAZA).href);

const INDEX_URL = new URL('index.html', BAZA).href;

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
                .catch(() => {
                    // Doar pentru navigare (schimbare de pagină) e corect să servim
                    // index.html ca fallback offline; pentru CSS/JS/imagini ar produce
                    // un răspuns HTML cu content-type greșit, deci lăsăm cererea să eșueze.
                    if (event.request.mode === 'navigate') {
                        return caches.match(INDEX_URL);
                    }
                    return Promise.reject(new Error('offline și fără răspuns în cache'));
                });
        })
    );
});
